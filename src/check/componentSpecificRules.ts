import type { Node } from '@xyflow/react';

import i18next from '../i18n';
import type { ComponentDataType } from '../types';
import { getComponentDisplayName } from '../utils/componentDisplayName';
import { readableWireLabel } from '../utils/wireLabel';
import type { CheckHandle, CheckNet, DiagramCheckContext } from './checkContext';
import { describeHandle } from './checkContext';
import type { DiagramCheckIssue, DiagramCheckIssueFingerprint, DiagramCheckTarget } from './diagramCheckTypes';

type TranslationValues = Record<string, number | string | undefined>;
type IssueOptions = {
  priority?: number;
  specificity?: number;
  fingerprint?: DiagramCheckIssueFingerprint;
  suppresses?: string[];
  suppressedBy?: string[];
};

export type ComponentSpecificRule = {
  id: string;
  componentTechnicalIds: string[];
  check: (context: DiagramCheckContext) => DiagramCheckIssue[];
};

const COMPONENT_RULE_ID = 'component-rules';

const checkText = (key: string, values?: TranslationValues) => (
  String(i18next.t(`sidebar.check.${key}`, { ns: 'main', ...values }))
);

const issueText = (
  issueKey: string,
  field: 'title' | 'shortDescription' | 'description' | 'recommendation',
  values?: TranslationValues,
) => checkText(`rules.${COMPONENT_RULE_ID}.issues.${issueKey}.${field}`, values);

const componentName = (node: Node<ComponentDataType>) => getComponentDisplayName(node.data, node.id);

const describeComponentHandle = (handle: CheckHandle) => describeHandle(handle, { includeComponent: false });

const nodeTarget = (node: Node<ComponentDataType>): DiagramCheckTarget => ({
  type: 'node',
  id: node.id,
  label: componentName(node),
});

const edgeTarget = (
  edge: CheckNet['edges'][number],
  nodes: Iterable<Node<ComponentDataType>> = [],
): DiagramCheckTarget => ({
  type: 'edge',
  id: edge.id,
  label: readableWireLabel(edge, nodes),
});

const handleTargets = (handle: CheckHandle): DiagramCheckTarget[] => [
  nodeTarget(handle.node),
  ...handle.connectedEdges.map((edge) => edgeTarget(edge, [handle.node])),
];

const netTargets = (net: CheckNet): DiagramCheckTarget[] => {
  const nodes = new Map(net.handles.map((handle) => [handle.node.id, nodeTarget(handle.node)]));
  const netNodes = net.handles.map((handle) => handle.node);
  const edges = new Map(net.edges.map((edge) => [edge.id, edgeTarget(edge, netNodes)]));
  return [...nodes.values(), ...edges.values()];
};

const uniqueTargets = (targets: DiagramCheckTarget[]) => {
  const targetsByKey = new Map<string, DiagramCheckTarget>();

  targets.forEach((target) => {
    targetsByKey.set(`${target.type}:${target.id}:${target.handleId || ''}`, target);
  });

  return Array.from(targetsByKey.values());
};

const translatedIssue = (
  issueKey: string,
  id: string,
  severity: DiagramCheckIssue['severity'],
  values?: TranslationValues,
  targets?: DiagramCheckTarget[],
  options?: IssueOptions,
): DiagramCheckIssue => ({
  id,
  ruleId: COMPONENT_RULE_ID,
  severity,
  priority: options?.priority,
  specificity: options?.specificity,
  fingerprint: options?.fingerprint,
  suppresses: options?.suppresses,
  suppressedBy: options?.suppressedBy,
  title: issueText(issueKey, 'title', values),
  shortDescription: issueText(issueKey, 'shortDescription', values),
  description: issueText(issueKey, 'description', values),
  recommendation: issueText(issueKey, 'recommendation', values),
  targets: targets ? uniqueTargets(targets) : undefined,
});

const hasFunction = (handle: CheckHandle, fn: string) => (
  handle.functions.includes(fn as never)
);

const handlesByNode = (context: DiagramCheckContext) => {
  const byNode = new Map<string, CheckHandle[]>();

  context.handles.forEach((handle) => {
    byNode.set(handle.node.id, [...(byNode.get(handle.node.id) || []), handle]);
  });

  return byNode;
};

const nodeHandleMap = (handles: CheckHandle[]) => (
  new Map(handles.map((handle) => [handle.handle.hid, handle]))
);

const netHasOtherHandleWithFunction = (
  context: DiagramCheckContext,
  handle: CheckHandle,
  fn: string,
) => (
  context.getNetByHandle(handle)?.handles.some((candidate) => (
    candidate.key !== handle.key && hasFunction(candidate, fn)
  )) || false
);

const sn74Ahct125nOePinIsDrivenOrEnabled = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => (
  netHasOtherHandleWithFunction(context, handle, 'dig_out') ||
  netHasOtherHandleWithFunction(context, handle, 'gnd')
);

const pinGroupIsUsed = (context: DiagramCheckContext, output: CheckHandle) => (
  output.connectedEdges.length > 0 &&
  context.signalReachableHandles(output).some((candidate) => (
    candidate.key !== output.key && hasFunction(candidate, 'dig_in')
  ))
);

const isLedDataOrClockInput = (handle: CheckHandle) => (
  handle.node.data.group === 'led' &&
  (hasFunction(handle, 'dig_in') || hasFunction(handle, 'dig_clock_in'))
);

const sn74Ahct125nPinGroups = [
  { channel: '1', oe: '1OE', input: '1A', output: '1Y' },
  { channel: '2', oe: '2OE', input: '2A', output: '2Y' },
  { channel: '3', oe: '3OE', input: '3A', output: '3Y' },
  { channel: '4', oe: '4OE', input: '4A', output: '4Y' },
];

const checkSN74AHCT125NUsedChannelInputs: ComponentSpecificRule = {
  id: 'sn74ahct125n-used-channel-inputs',
  componentTechnicalIds: ['SN74AHCT125N'],
  check: (context) => {
    const issues: DiagramCheckIssue[] = [];

    handlesByNode(context).forEach((nodeHandles) => {
      const node = nodeHandles[0]?.node;
      if (!node || node.data.technicalID !== 'SN74AHCT125N') return;

      const handles = nodeHandleMap(nodeHandles);

      sn74Ahct125nPinGroups.forEach((group) => {
        const output = handles.get(group.output);
        const input = handles.get(group.input);
        const oe = handles.get(group.oe);
        if (!output || !input || !oe || !pinGroupIsUsed(context, output)) return;

        const missingHandles = [
          ...(!netHasOtherHandleWithFunction(context, input, 'dig_out') ? [input] : []),
          ...(!sn74Ahct125nOePinIsDrivenOrEnabled(context, oe) ? [oe] : []),
        ];
        if (missingHandles.length === 0) return;

        const outputNet = context.getNetByHandle(output);
        const missingNetTargets = missingHandles
          .map((handle) => context.getNetByHandle(handle))
          .filter((net): net is CheckNet => Boolean(net))
          .flatMap(netTargets);

        issues.push(translatedIssue(
          'sn74Ahct125nUsedChannelInputMissing',
          `component-sn74ahct125n-used-channel-input-missing-${node.id}-${group.channel}`,
          'error',
          {
            component: componentName(node),
            channel: group.channel,
            output: describeComponentHandle(output),
            handles: missingHandles.map(describeComponentHandle).join(', '),
          },
          [
            nodeTarget(node),
            ...handleTargets(output),
            ...missingHandles.flatMap(handleTargets),
            ...(outputNet ? netTargets(outputNet) : []),
            ...missingNetTargets,
          ],
          {
            priority: 38,
            specificity: 100,
            fingerprint: {
              scope: 'component',
              key: `${node.id}:${group.channel}`,
              problem: 'sn74ahct125n-used-channel-input-missing',
            },
            suppresses: [
              'digital-sink-without-source',
              'multiple-digital-sources',
              'digital-signal-voltage-mismatch',
            ],
          },
        ));
      });
    });

    return issues;
  },
};

const checkSN74AHCT125NDirectLedOutputMissingSeriesResistor: ComponentSpecificRule = {
  id: 'sn74ahct125n-direct-led-output-series-resistor',
  componentTechnicalIds: ['SN74AHCT125N'],
  check: (context) => {
    const issues: DiagramCheckIssue[] = [];

    handlesByNode(context).forEach((nodeHandles) => {
      const node = nodeHandles[0]?.node;
      if (!node || node.data.technicalID !== 'SN74AHCT125N') return;

      nodeHandles
        .filter((output) => hasFunction(output, 'dig_out') && output.connectedEdges.length > 0)
        .forEach((output) => {
          const elementaryNet = context.getElementaryNetByHandle(output);
          if (!elementaryNet) return;

          elementaryNet.handles
            .filter((candidate) => candidate.key !== output.key)
            .filter(isLedDataOrClockInput)
            .forEach((ledInput) => {
              issues.push(translatedIssue(
                'sn74Ahct125nDirectLedOutputMissingSeriesResistor',
                `component-sn74ahct125n-direct-led-output-missing-series-resistor-${output.key}-${ledInput.key}`,
                'warning',
                {
                  output: describeComponentHandle(output),
                  input: describeComponentHandle(ledInput),
                  led: componentName(ledInput.node),
                },
                [
                  nodeTarget(node),
                  ...handleTargets(output),
                  ...handleTargets(ledInput),
                  ...netTargets(elementaryNet),
                ],
                {
                  priority: 72,
                  specificity: 80,
                  fingerprint: {
                    scope: 'handle',
                    key: `${output.key}:${ledInput.key}`,
                    problem: 'sn74ahct125n-direct-led-output-missing-series-resistor',
                  },
                },
              ));
            });
        });
    });

    return issues;
  },
};

export const componentSpecificRules: ComponentSpecificRule[] = [
  checkSN74AHCT125NUsedChannelInputs,
  checkSN74AHCT125NDirectLedOutputMissingSeriesResistor,
];

export const runComponentSpecificRules = (context: DiagramCheckContext) => (
  componentSpecificRules.flatMap((rule) => rule.check(context))
);
