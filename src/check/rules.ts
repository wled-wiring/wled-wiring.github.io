import type { Edge, Node } from '@xyflow/react';

import i18next from '../i18n';
import type { ComponentDataType, EdgeDataType } from '../types';
import { normalizeWireCrosssectionToMm2 } from '../simulation/wireResistance';
import { getComponentDisplayName } from '../utils/componentDisplayName';
import { readableWireLabel } from '../utils/wireLabel';
import type { DiagramCheckSettings } from './checkSettingsStore';
import type { CheckHandle, CheckInvalidWire, CheckNet, CheckNetClassification, DiagramCheckContext } from './checkContext';
import { describeHandle } from './checkContext';
import { runComponentSpecificRules } from './componentSpecificRules';
import type { DiagramCheckIssue, DiagramCheckIssueFingerprint, DiagramCheckTarget } from './diagramCheckTypes';
import { checkWireProtectionRules } from './wireProtection';

export type DiagramCheckRule = {
  id: string;
  title: string;
  description: string;
  issueKeys: string[];
  check: (context: DiagramCheckContext, settings: DiagramCheckSettings) => DiagramCheckIssue[];
};

export type DiagramCheckRuleInfo = {
  id: string;
  title: string;
  description: string;
  checks: {
    id: string;
    title: string;
    description: string;
  }[];
};

type TranslationValues = Record<string, number | string | undefined>;
type IssueOptions = {
  priority?: number;
  specificity?: number;
  fingerprint?: DiagramCheckIssueFingerprint;
  suppresses?: string[];
  suppressedBy?: string[];
  diagnosticOnly?: boolean;
};

const checkText = (key: string, values?: TranslationValues) => (
  String(i18next.t(`sidebar.check.${key}`, { ns: 'main', ...values }))
);

const ruleText = (ruleId: string, field: 'title' | 'description') => (
  checkText(`rules.${ruleId}.${field}`)
);

const issueText = (
  ruleId: string,
  issueKey: string,
  field: 'title' | 'shortDescription' | 'description' | 'recommendation',
  values?: TranslationValues,
) => checkText(`rules.${ruleId}.issues.${issueKey}.${field}`, values);

const formatLocalizedFixed = (value: number, fractionDigits: number) => (
  new Intl.NumberFormat(i18next.resolvedLanguage || i18next.language, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
);

const formatVoltage = (value: number) => formatLocalizedFixed(value, 2);

const componentName = (node: Node<ComponentDataType>) => getComponentDisplayName(node.data, node.id);

const describeComponentHandle = (handle: CheckHandle) => describeHandle(handle, { includeComponent: false });

const ruleOverviewValues = (issueKey: string): TranslationValues | undefined => {
  if(issueKey === 'signalSinkWithoutSource' || issueKey === 'multipleSignalSources') {
    return {signal: checkText('rulePlaceholders.signal')};
  }

  if(issueKey === 'mainsInputMissing') {
    return {label: checkText('rulePlaceholders.mainsInput')};
  }

  return undefined;
};

const ruleInfo = (rule: DiagramCheckRule): DiagramCheckRuleInfo => ({
  id: rule.id,
  title: rule.title,
  description: rule.description,
  checks: rule.issueKeys.map((issueKey) => {
    const values = ruleOverviewValues(issueKey);
    return {
      id: `${rule.id}.${issueKey}`,
      title: issueText(rule.id, issueKey, 'title', values),
      description: issueText(rule.id, issueKey, 'shortDescription', values),
    };
  }),
});

const nodeTarget = (node: Node<ComponentDataType>): DiagramCheckTarget => ({
  type: 'node',
  id: node.id,
  label: componentName(node),
});

const edgeTarget = (
  edge: Edge<EdgeDataType>,
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

const issue = (
  id: string,
  severity: DiagramCheckIssue['severity'],
  title: string,
  shortDescription: string,
  description: string,
  recommendation?: string,
  targets?: DiagramCheckTarget[],
  ruleId = 'network-rules',
  options?: IssueOptions,
): DiagramCheckIssue => ({
  id,
  ruleId,
  severity,
  priority: options?.priority,
  specificity: options?.specificity,
  fingerprint: options?.fingerprint,
  suppresses: options?.suppresses,
  suppressedBy: options?.suppressedBy,
  diagnosticOnly: options?.diagnosticOnly,
  title,
  shortDescription,
  description,
  recommendation,
  targets: targets ? uniqueTargets(targets) : undefined,
});

const translatedIssue = (
  ruleId: string,
  issueKey: string,
  id: string,
  severity: DiagramCheckIssue['severity'],
  values?: TranslationValues,
  targets?: DiagramCheckTarget[],
  options?: IssueOptions,
) => issue(
  id,
  severity,
  issueText(ruleId, issueKey, 'title', values),
  issueText(ruleId, issueKey, 'shortDescription', values),
  issueText(ruleId, issueKey, 'description', values),
  issueText(ruleId, issueKey, 'recommendation', values),
  targets,
  ruleId,
  options,
);

const hasFunction = (handle: CheckHandle, fn: string) => (
  handle.functions.includes(fn as never)
);

const isTechnicalComponent = (node: Node<ComponentDataType>) => (
  !['InfoNode', 'LineBoxNode', 'WireInfoNode'].includes(node.data.technicalID)
);

const isPassiveConnectorComponent = (node: Node<ComponentDataType>) => (
  ['SolderJoint', 'WAGO_2X', 'WAGO_3X'].includes(node.data.technicalID)
);

const diagramIssueOptions = (
  problem: string,
  specificity: number,
  priority: number,
  extra?: Pick<IssueOptions, 'suppresses' | 'suppressedBy' | 'diagnosticOnly'>,
): IssueOptions => ({
  priority,
  specificity,
  fingerprint: {
    scope: 'diagram',
    key: 'diagram',
    problem,
  },
  ...extra,
});

const netIssueOptions = (
  net: CheckNet,
  problem: string,
  specificity: number,
  priority: number,
  extra?: Pick<IssueOptions, 'suppresses' | 'suppressedBy' | 'diagnosticOnly'>,
): IssueOptions => ({
  priority,
  specificity,
  fingerprint: {
    scope: 'net',
    key: net.id,
    problem,
  },
  ...extra,
});

const componentIssueOptions = (
  node: Node<ComponentDataType>,
  problem: string,
  specificity: number,
  priority: number,
  extra?: Pick<IssueOptions, 'suppresses' | 'suppressedBy' | 'diagnosticOnly'>,
): IssueOptions => ({
  priority,
  specificity,
  fingerprint: {
    scope: 'component',
    key: node.id,
    problem,
  },
  ...extra,
});

const handleIssueOptions = (
  handle: CheckHandle,
  problem: string,
  specificity: number,
  priority: number,
  extra?: Pick<IssueOptions, 'suppresses' | 'suppressedBy' | 'diagnosticOnly'>,
): IssueOptions => ({
  priority,
  specificity,
  fingerprint: {
    scope: 'handle',
    key: handle.key,
    problem,
  },
  ...extra,
});

const edgeIssueOptions = (
  edge: Edge<EdgeDataType>,
  problem: string,
  specificity: number,
  priority: number,
  extra?: Pick<IssueOptions, 'suppresses' | 'suppressedBy' | 'diagnosticOnly'>,
): IssueOptions => ({
  priority,
  specificity,
  fingerprint: {
    scope: 'edge',
    key: edge.id,
    problem,
  },
  ...extra,
});

const hasInputField = (handle: CheckHandle, technicalId?: string) => (
  Boolean(technicalId && handle.node.data.inputFields?.some((field) => field.technicalID === technicalId))
);

const getDependencyInputHandle = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => {
  const dependency = handle.handle.VoutDependency;
  if (!dependency) return undefined;

  const dependencyHandle = context.getHandle(handle.node.id, dependency);
  if (!dependencyHandle || !hasFunction(dependencyHandle, 'suppl_in')) return undefined;

  return dependencyHandle;
};

const getFusedInputHandle = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => {
  const connection = handle.node.data.internalConnections?.find((candidate) => (
    candidate.kind === 'fuse' &&
    (candidate.fromHandle === handle.handle.hid || candidate.toHandle === handle.handle.hid)
  ));
  if (!connection) return undefined;

  const counterpartHandleId = connection.fromHandle === handle.handle.hid
    ? connection.toHandle
    : connection.fromHandle;
  const counterpart = context.getHandle(handle.node.id, counterpartHandleId);

  return counterpart && hasFunction(counterpart, 'suppl_in') ? counterpart : undefined;
};

const isForwardedSupplyOutput = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => (
  Boolean(getDependencyInputHandle(context, handle) || getFusedInputHandle(context, handle))
);

const supplySourceKey = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => {
  if (hasInputField(handle, handle.handle.VoutDependency)) {
    return `${handle.node.id}:input-field:${handle.handle.VoutDependency}`;
  }

  if (typeof handle.handle.Vout === 'number' && handle.handle.Vout > 0) {
    return `${handle.node.id}:fixed:${handle.handle.Vout}`;
  }

  const resolvedVoltage = context.resolveVoltageOut(handle);
  if (resolvedVoltage !== undefined) {
    return `${handle.node.id}:resolved:${resolvedVoltage}`;
  }

  return `${handle.node.id}:handle:${handle.handle.hid}`;
};

const independentSupplySources = (
  context: DiagramCheckContext,
  net: CheckNet,
) => {
  const sourcesByKey = new Map<string, CheckHandle[]>();
  const outputHandles = net.sourceHandles
    .filter((handle) => hasFunction(handle, 'suppl_out'))
    .filter((handle) => !isForwardedSupplyOutput(context, handle));
  const exclusiveOutputHandles = outputHandles.filter((handle) => !hasFunction(handle, 'suppl_in'));
  const sourceHandles = exclusiveOutputHandles.length > 0
    ? exclusiveOutputHandles
    : outputHandles.slice(0, 1);

  sourceHandles.forEach((handle) => {
    const key = supplySourceKey(context, handle);
    sourcesByKey.set(key, [...(sourcesByKey.get(key) || []), handle]);
  });

  return Array.from(sourcesByKey.entries()).map(([key, handles]) => ({ key, handles }));
};

const classificationLabel = (classification: CheckNetClassification) => (
  checkText(`classificationLabels.${classification}`)
);

const signalLabel = (signalId: string) => checkText(`signalLabels.${signalId}`);

const mainsInputLabel = (inputId: string) => checkText(`mainsInputLabels.${inputId}`);

const analogLedColorLabel = (colorId: string) => checkText(`analogLedColorLabels.${colorId}`);

const netHasAnyClassification = (
  net: CheckNet,
  classifications: CheckNetClassification[],
) => classifications.some((classification) => net.classifications.includes(classification));

const handleNetHasClassification = (
  context: DiagramCheckContext,
  handle: CheckHandle,
  classification: CheckNetClassification,
) => (
  context.getNetByHandle(handle)?.classifications.includes(classification) || false
);

const supplyInputHasExternalSource = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => {
  const net = context.getNetByHandle(handle);
  if (!net?.classifications.includes('suppl_net_type')) return false;

  return net.handles.some((candidate) => (
    candidate.node.id !== handle.node.id &&
    hasFunction(candidate, 'suppl_out')
  ));
};

const handlesByNode = (context: DiagramCheckContext) => {
  const byNode = new Map<string, CheckHandle[]>();

  context.handles.forEach((handle) => {
    byNode.set(handle.node.id, [...(byNode.get(handle.node.id) || []), handle]);
  });

  return byNode;
};

const lowVoltageOrSignalClassifications: CheckNetClassification[] = [
  'gnd_net_type',
  'suppl_net_type',
  'digital_net_type',
  'pwm_net_type',
  'analog_net_type',
  'audio_net_type',
  'eth_net_type',
  'usb_net_type',
  'rs485_a_net_type',
  'rs485_b_net_type',
];

const activeOrSignalClassifications: CheckNetClassification[] = [
  'L_net_type',
  'N_net_type',
  'suppl_net_type',
  'digital_net_type',
  'pwm_net_type',
  'analog_net_type',
  'audio_net_type',
  'eth_net_type',
  'usb_net_type',
  'rs485_a_net_type',
  'rs485_b_net_type',
];

type SignalRuleDefinition = {
  id: string;
  label: string;
  classification: CheckNetClassification;
  sourceFunctions: string[];
  sinkFunctions: string[];
};

type EffectiveSignalRole = {
  definition: SignalRuleDefinition;
  direction: 'source' | 'sink';
  handle: CheckHandle;
  confidence: 'hard' | 'inferred';
  reason: string;
};

export type EffectiveSignalRoleDiagnostic = {
  signalId: string;
  signalLabel: string;
  handle: CheckHandle;
  direction?: 'source' | 'sink';
  confidence?: 'hard' | 'inferred';
  status: 'resolved' | 'unclear';
  reason: string;
};

const signalRuleDefinitions: SignalRuleDefinition[] = [
  {
    id: 'digital',
    label: 'Digital',
    classification: 'digital_net_type',
    sourceFunctions: ['dig_out', 'dig_clock_out', 'dig_backup_out'],
    sinkFunctions: ['dig_in', 'dig_clock_in', 'dig_backup_in'],
  },
  {
    id: 'pwm',
    label: 'PWM',
    classification: 'pwm_net_type',
    sourceFunctions: ['pwm_out'],
    sinkFunctions: ['pwm_in_R', 'pwm_in_G', 'pwm_in_B', 'pwm_in_W', 'pwm_in_WW'],
  },
  {
    id: 'analog',
    label: 'Analog',
    classification: 'analog_net_type',
    sourceFunctions: ['an_out'],
    sinkFunctions: ['an_in'],
  },
  {
    id: 'audio',
    label: 'Audio',
    classification: 'audio_net_type',
    sourceFunctions: ['audio_out'],
    sinkFunctions: ['audio_in'],
  },
  {
    id: 'usb',
    label: 'USB',
    classification: 'usb_net_type',
    sourceFunctions: ['usb_power_out'],
    sinkFunctions: ['usb_full'],
  },
];

const digitalSinkFunctions = ['dig_in', 'dig_clock_in', 'dig_backup_in'];
const digitalSourceFunctions = ['dig_out', 'dig_clock_out', 'dig_backup_out'];
const analogLedColorChannels = [
  { id: 'red', fn: 'pwm_in_R' },
  { id: 'green', fn: 'pwm_in_G' },
  { id: 'blue', fn: 'pwm_in_B' },
  { id: 'white', fn: 'pwm_in_W' },
  { id: 'warmWhite', fn: 'pwm_in_WW' },
];

const isDigitalSinkCapable = (handle: CheckHandle) => (
  digitalSinkFunctions.some((fn) => hasFunction(handle, fn))
);

const isDigitalSink = isDigitalSinkCapable;

const isDigitalSourceCapable = (handle: CheckHandle) => (
  digitalSourceFunctions.some((fn) => hasFunction(handle, fn))
);

const isDigitalSource = isDigitalSourceCapable;

const digitalSourceCapableHandlesForInput = (
  context: DiagramCheckContext,
  input: CheckHandle,
) => (
  context.signalReachableHandles(input)
    .filter((candidate) => candidate.node.id !== input.node.id)
    .filter(isDigitalSourceCapable)
);

const netHasDigitalSourceCapable = (
  context: DiagramCheckContext,
  net: CheckNet,
) => (
  net.handles.some((handle) => (
    isDigitalSourceCapable(handle) ||
    digitalSourceCapableHandlesForInput(context, handle).length > 0
  ))
);

const handleHasDigitalSourceCapableNet = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => {
  const net = context.getNetByHandle(handle);
  return Boolean(net && netHasDigitalSourceCapable(context, net));
};

const isUsbFull = (handle: CheckHandle) => hasFunction(handle, 'usb_full');

const usbPowerSources = (net: CheckNet) => handlesWithAnyFunction(net.handles, ['usb_power_out']);
const usbPowerSinks = (net: CheckNet) => handlesWithAnyFunction(net.handles, ['usb_full']);

const usbPowerPairInvalidReasons = (net: CheckNet) => {
  if(!net.classifications.includes('usb_net_type')) return [];

  const sources = usbPowerSources(net);
  const sinks = usbPowerSinks(net);
  const reasons: string[] = [];

  if(sources.length !== 1) {
    reasons.push(`expected exactly one USB power source, found ${sources.length}`);
  }
  if(sinks.length !== 1) {
    reasons.push(`expected exactly one USB sink, found ${sinks.length}`);
  }
  if(net.edges.length !== 1) {
    reasons.push(`expected exactly one visible USB wire, found ${net.edges.length}`);
  }
  if(net.handles.length !== sources.length + sinks.length) {
    reasons.push('USB power net contains passive or non-USB terminals');
  }
  if(net.classifications.some((classification) => classification !== 'usb_net_type')) {
    reasons.push('USB power net is mixed with another net classification');
  }

  return reasons;
};

const isValidUsbPowerPairNet = (net: CheckNet | undefined) => (
  Boolean(net && usbPowerPairInvalidReasons(net).length === 0)
);

const isInvalidUsbPowerPairNet = (net: CheckNet | undefined) => (
  Boolean(net && net.classifications.includes('usb_net_type') && usbPowerPairInvalidReasons(net).length > 0)
);

const nodeHasValidUsbPowerConnection = (
  context: DiagramCheckContext,
  nodeId: string,
) => (
  context.handles
    .filter((handle) => handle.node.id === nodeId)
    .some((handle) => (
      hasFunction(handle, 'usb_full') &&
      isValidUsbPowerPairNet(context.getNetByHandle(handle))
    ))
);

const nodeHasInvalidUsbPowerConnection = (
  context: DiagramCheckContext,
  nodeId: string,
) => (
  context.handles
    .filter((handle) => handle.node.id === nodeId)
    .some((handle) => (
      hasFunction(handle, 'usb_full') &&
      isInvalidUsbPowerPairNet(context.getNetByHandle(handle))
    ))
);

const isPassiveSignalComponent = (handle: CheckHandle) => (
  ['Kerko', 'Resistor'].includes(handle.node.data.technicalID)
);

const handlesWithAnyFunction = (handles: CheckHandle[], functions: string[]) => (
  handles.filter((handle) => functions.some((fn) => hasFunction(handle, fn)))
);

const hasSignalSourceCapability = (
  handle: CheckHandle,
  definition: SignalRuleDefinition,
) => definition.sourceFunctions.some((fn) => hasFunction(handle, fn));

const hasSignalSinkCapability = (
  handle: CheckHandle,
  definition: SignalRuleDefinition,
) => definition.sinkFunctions.some((fn) => hasFunction(handle, fn));

const isHardSignalSource = (
  handle: CheckHandle,
  definition: SignalRuleDefinition,
) => (
  hasSignalSourceCapability(handle, definition) &&
  !hasSignalSinkCapability(handle, definition)
);

const isHardSignalSink = (
  handle: CheckHandle,
  definition: SignalRuleDefinition,
) => (
  hasSignalSinkCapability(handle, definition) &&
  !hasSignalSourceCapability(handle, definition)
);

const uniqueHandles = (handles: CheckHandle[]) => (
  Array.from(new Map(handles.map((handle) => [handle.key, handle])).values())
);

const signalContextHandles = (
  context: DiagramCheckContext,
  net: CheckNet,
  definition: SignalRuleDefinition,
) => {
  if (definition.id !== 'digital') return net.handles;

  return uniqueHandles([
    ...net.handles,
    ...net.handles.flatMap((handle) => context.signalReachableHandles(handle)),
  ]);
};

const effectiveSignalRolesForNet = (
  context: DiagramCheckContext,
  net: CheckNet,
  definition: SignalRuleDefinition,
): EffectiveSignalRole[] => {
  const handles = signalContextHandles(context, net, definition);
  const hardSources = handles.filter((handle) => isHardSignalSource(handle, definition));
  const hardSinks = handles.filter((handle) => isHardSignalSink(handle, definition));
  const ambiguousHandles = handles.filter((handle) => (
    hasSignalSourceCapability(handle, definition) &&
    hasSignalSinkCapability(handle, definition)
  ));

  const roles: EffectiveSignalRole[] = [
    ...hardSources.map((handle) => ({
      definition,
      direction: 'source' as const,
      handle,
      confidence: 'hard' as const,
      reason: 'source capability without matching sink capability for this signal type',
    })),
    ...hardSinks.map((handle) => ({
      definition,
      direction: 'sink' as const,
      handle,
      confidence: 'hard' as const,
      reason: 'sink capability without matching source capability for this signal type',
    })),
  ];

  if (hardSources.length > 0) {
    roles.push(...ambiguousHandles.map((handle) => ({
      definition,
      direction: 'sink' as const,
      handle,
      confidence: 'inferred' as const,
      reason: 'inferred as sink because the signal context contains a hard source',
    })));
  } else if (hardSinks.length > 0) {
    roles.push(...ambiguousHandles.map((handle) => ({
      definition,
      direction: 'source' as const,
      handle,
      confidence: 'inferred' as const,
      reason: 'inferred as source because the signal context contains a hard sink and no hard source',
    })));
  }

  const rolesByKey = new Map<string, EffectiveSignalRole>();
  roles.forEach((role) => {
    rolesByKey.set(`${role.handle.key}:${role.definition.id}:${role.direction}`, role);
  });

  return Array.from(rolesByKey.values());
};

const effectiveSignalSourcesForNet = (
  context: DiagramCheckContext,
  net: CheckNet,
  definition: SignalRuleDefinition,
) => (
  effectiveSignalRolesForNet(context, net, definition)
    .filter((role) => role.direction === 'source')
    .map((role) => role.handle)
);

const effectiveSignalSinksForNet = (
  context: DiagramCheckContext,
  net: CheckNet,
  definition: SignalRuleDefinition,
) => (
  effectiveSignalRolesForNet(context, net, definition)
    .filter((role) => role.direction === 'sink')
    .map((role) => role.handle)
);

export const effectiveSignalRoleDiagnosticsForNet = (
  context: DiagramCheckContext,
  net: CheckNet,
): EffectiveSignalRoleDiagnostic[] => (
  signalRuleDefinitions.flatMap((definition) => {
    const handles = signalContextHandles(context, net, definition);
    const roles = effectiveSignalRolesForNet(context, net, definition);
    const roleKeys = new Set(roles.map((role) => `${role.handle.key}:${role.definition.id}`));
    const ambiguousHandles = handles.filter((handle) => (
      hasSignalSourceCapability(handle, definition) &&
      hasSignalSinkCapability(handle, definition)
    ));
    const unclearHandles = ambiguousHandles.filter((handle) => (
      !roleKeys.has(`${handle.key}:${definition.id}`)
    ));

    return [
      ...roles.map((role) => ({
        signalId: definition.id,
        signalLabel: definition.label,
        handle: role.handle,
        direction: role.direction,
        confidence: role.confidence,
        status: 'resolved' as const,
        reason: role.reason,
      })),
      ...unclearHandles.map((handle) => ({
        signalId: definition.id,
        signalLabel: definition.label,
        handle,
        status: 'unclear' as const,
        reason: 'ambiguous source/sink capabilities, but no hard counterpart exists in this signal context',
      })),
    ];
  })
);

const hasResolvedRoleForOtherSignal = (
  context: DiagramCheckContext,
  net: CheckNet,
  handle: CheckHandle,
  currentDefinition: SignalRuleDefinition,
) => (
  signalRuleDefinitions
    .filter((definition) => definition.id !== currentDefinition.id)
    .some((definition) => {
      const roles = effectiveSignalRolesForNet(context, net, definition);
      const hasHandleRole = roles.some((role) => role.handle.key === handle.key);
      const hasSource = roles.some((role) => role.direction === 'source');
      const hasSink = roles.some((role) => role.direction === 'sink');
      return hasHandleRole && hasSource && hasSink;
    })
);

const isFirstSinkDefinitionForHandle = (
  handle: CheckHandle,
  definition: SignalRuleDefinition,
) => {
  const firstSinkDefinition = signalRuleDefinitions.find((candidate) => (
    hasSignalSinkCapability(handle, candidate)
  ));

  return firstSinkDefinition?.id === definition.id;
};

const voltageMatches = (sourceVoltage: number | undefined, target: CheckHandle) => {
  if (sourceVoltage === undefined) return false;
  const min = target.voltageMin;
  const max = target.voltageMax;
  if (min === undefined && max === undefined) return true;
  return (min === undefined || sourceVoltage >= min) && (max === undefined || sourceVoltage <= max);
};

const hasVoltageTolerance = (handle: CheckHandle) => (
  typeof handle.handle.tolVmin === 'number' ||
  typeof handle.handle.tolVmax === 'number'
);

const voltageMatchesHandleTolerance = (sourceVoltage: number | undefined, target: CheckHandle) => {
  if (sourceVoltage === undefined) return false;
  const min = target.handle.tolVmin;
  const max = target.handle.tolVmax;
  if (min === undefined && max === undefined) return true;
  return (min === undefined || sourceVoltage >= min) && (max === undefined || sourceVoltage <= max);
};

const digitalBiasTargets = (reachableHandles: CheckHandle[]) => (
  reachableHandles.filter((handle) => (
    isDigitalSink(handle) && !isPassiveSignalComponent(handle)
  ))
);

const hasReachableDigitalSource = (context: DiagramCheckContext, handle: CheckHandle) => (
  context.signalReachableHandles(handle).some(isDigitalSource)
);

const hasValidDigitalBias = (context: DiagramCheckContext, handle: CheckHandle) => {
  const reachableHandles = context.signalReachableHandles(handle);
  const targets = digitalBiasTargets(reachableHandles);
  if (targets.length === 0) return false;

  if (reachableHandles.some((candidate) => hasFunction(candidate, 'gnd'))) {
    return targets.some((target) => voltageMatches(0, target));
  }

  return reachableHandles
    .filter((candidate) => hasFunction(candidate, 'suppl_out'))
    .some((source) => {
      const sourceVoltage = context.resolveVoltageOut(source);
      return targets.some((target) => voltageMatches(sourceVoltage, target));
    });
};

const hasDigitalBiasConsumer = (context: DiagramCheckContext, net: CheckNet) => (
  net.handles.some((handle) => hasValidDigitalBias(context, handle))
);

const digitalVoltageMismatchReason = (
  sourceVoltage: number | undefined,
  target: CheckHandle,
) => {
  if (sourceVoltage === undefined) return undefined;
  const min = target.voltageMin;
  const max = target.voltageMax;

  if (min !== undefined && sourceVoltage < min) return 'low';
  if (max !== undefined && sourceVoltage > max) return 'high';
  return undefined;
};

const digitalSignalSourcesForInput = (
  context: DiagramCheckContext,
  input: CheckHandle,
) => (
  context.signalReachableHandles(input)
    .filter((candidate) => candidate.node.id !== input.node.id)
    .filter(isDigitalSource)
);

const digitalSourcesForSignalInput = (
  context: DiagramCheckContext,
  input: CheckHandle,
  allowedFunctions: string[] = ['dig_out', 'dig_clock_out'],
) => (
  context.signalReachableHandles(input)
    .filter((candidate) => candidate.node.id !== input.node.id)
    .filter((candidate) => allowedFunctions.some((fn) => hasFunction(candidate, fn)))
);

const signalPathContainsHandle = (
  context: DiagramCheckContext,
  input: CheckHandle,
  target: CheckHandle,
) => (
  input.key === target.key ||
  context.signalReachableHandles(input).some((candidate) => candidate.key === target.key)
);

const pathHasSupply = (context: DiagramCheckContext, input: CheckHandle) => {
  const net = context.getNetByHandle(input);
  return (
    Boolean(net?.classifications.includes('suppl_net_type')) ||
    context.signalReachableHandles(input).some((candidate) => hasFunction(candidate, 'suppl_out'))
  );
};

const pathHasGroundOrBias = (context: DiagramCheckContext, input: CheckHandle) => {
  const net = context.getNetByHandle(input);
  return (
    Boolean(net?.classifications.includes('gnd_net_type')) ||
    context.signalReachableHandles(input).some((candidate) => hasFunction(candidate, 'gnd')) ||
    hasValidDigitalBias(context, input)
  );
};

const isLedDataOrBackupSink = (handle: CheckHandle) => (
  handle.node.data.group === 'led' &&
  (hasFunction(handle, 'dig_in') || hasFunction(handle, 'dig_backup_in'))
);

const pathLedDataOrBackupSinks = (
  context: DiagramCheckContext,
  input: CheckHandle,
) => (
  context.signalReachableHandles(input)
    .filter((candidate) => candidate.key !== input.key)
    .filter(isLedDataOrBackupSink)
);

const sn74Ahct125nPinGroups = [
  { input: '1A', output: '1Y' },
  { input: '2A', output: '2Y' },
  { input: '3A', output: '3Y' },
  { input: '4A', output: '4Y' },
];

const sn74Ahct125nChannelInputForOutput = (
  context: DiagramCheckContext,
  output: CheckHandle,
) => {
  if (output.node.data.technicalID !== 'SN74AHCT125N') return undefined;

  const channel = sn74Ahct125nPinGroups.find((group) => group.output === output.handle.hid);
  if (!channel) return undefined;

  return context.getHandle(output.node.id, channel.input);
};

const resolveLogicalDigitalOrigin = (
  context: DiagramCheckContext,
  sourceHandle: CheckHandle,
  visited = new Set<string>(),
): CheckHandle | undefined => {
  if (visited.has(sourceHandle.key)) return undefined;
  visited.add(sourceHandle.key);

  if (sourceHandle.node.data.group === 'controller') return sourceHandle;

  const channelInput = sn74Ahct125nChannelInputForOutput(context, sourceHandle);
  if (!channelInput) return undefined;

  const upstreamSources = digitalSourcesForSignalInput(context, channelInput, ['dig_out'])
    .filter((candidate) => candidate.key !== sourceHandle.key);
  if (upstreamSources.length !== 1) return undefined;

  return resolveLogicalDigitalOrigin(context, upstreamSources[0], visited);
};

const shouldCheckDigitalSignalVoltage = (
  net: CheckNet,
  digitalSources: CheckHandle[],
) => (
  net.classifications.includes('digital_net_type') ||
  (net.classifications.length === 0 && digitalSources.length > 0)
);

const mainsFunctions = ['line_in', 'line_out', 'neutral_in', 'neutral_out', 'pe_in', 'pe_out'];

const hasMainsFunction = (handle: CheckHandle) => (
  mainsFunctions.some((fn) => hasFunction(handle, fn))
);

const hasAnyConnectedEdge = (handles: CheckHandle[]) => (
  handles.some((handle) => handle.connectedEdges.length > 0)
);

const issueTargetsForInvalidWire = (invalidWire: CheckInvalidWire) => (
  [
    edgeTarget(invalidWire.edge),
    ...(invalidWire.node ? [nodeTarget(invalidWire.node)] : []),
  ]
);

const checkWireConnectedToHiddenOrMissingHandle = (context: DiagramCheckContext) => (
  context.invalidWires.map((invalidWire) => translatedIssue(
    'network-rules',
    'wireConnectedToHiddenOrMissingHandle',
    `wire-connected-to-hidden-or-missing-handle-${invalidWire.edge.id}-${invalidWire.side}`,
    'error',
    {
      wire: invalidWire.edge.id,
      side: invalidWire.side,
      handle: invalidWire.handleId || 'unknown',
      reason: checkText(`invalidWireReasons.${invalidWire.reason}`),
    },
    issueTargetsForInvalidWire(invalidWire),
    edgeIssueOptions(invalidWire.edge, 'wire-connected-to-hidden-or-missing-handle', 90, 10),
  ))
);

const checkDuplicateParallelWires = (context: DiagramCheckContext) => {
  const groups = new Map<string, Edge<EdgeDataType>[]>();

  context.edges.forEach((edge) => {
    const a = `${edge.source}:${edge.sourceHandle || ''}`;
    const b = `${edge.target}:${edge.targetHandle || ''}`;
    const key = [a, b].sort().join('<->');
    groups.set(key, [...(groups.get(key) || []), edge]);
  });

  return Array.from(groups.values())
    .filter((edges) => edges.length > 1)
    .map((edges) => translatedIssue(
      'network-rules',
      'duplicateParallelWire',
      `duplicate-parallel-wire-${edges.map((edge) => edge.id).sort().join('-')}`,
      'info',
      { count: edges.length },
      edges.map((edge) => edgeTarget(edge)),
      edgeIssueOptions(edges[0], 'duplicate-parallel-wire', 35, 170),
    ));
};

const checkWireWithoutPhysicalParameters = (context: DiagramCheckContext) => (
  context.componentLinkedNets
    .filter((net) => netHasAnyClassification(net, ['suppl_net_type', 'gnd_net_type', 'usb_net_type']))
    .flatMap((net) => net.edges.map((edge) => ({ net, edge })))
    .filter(({ edge }) => (
      (edge.data?.physType === 'single' || edge.data?.physType === 'usb') &&
      (typeof edge.data?.physLength !== 'number' || edge.data.physLength <= 0 ||
        typeof edge.data?.physCrosssection !== 'number' || edge.data.physCrosssection <= 0)
    ))
    .map(({ edge }) => translatedIssue(
      'network-rules',
      'wireWithoutPhysicalParameters',
      `wire-without-physical-parameters-${edge.id}`,
      'warning',
      undefined,
      [edgeTarget(edge)],
      edgeIssueOptions(edge, 'wire-without-physical-parameters', 40, 150, {
        suppressedBy: ['wire-connected-to-hidden-or-missing-handle'],
      }),
    ))
);

const formatMm2 = (value: number) => (
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
);

const handleNodeTarget = (handle: CheckHandle): DiagramCheckTarget => ({
  ...nodeTarget(handle.node),
  handleId: handle.handle.hid,
});

const edgeCrossSectionMm2 = (edge: Edge<EdgeDataType>) => {
  const result = normalizeWireCrosssectionToMm2(
    edge.data?.physCrosssection,
    edge.data?.physCrosssectionUnit,
  );

  return result.ok ? result.crosssectionMm2 : undefined;
};

const checkPinCrossSectionLimit = (context: DiagramCheckContext) => (
  context.handles.flatMap((handle) => {
    if (handle.connectedEdges.length === 0) return [];

    const connectedEdgesWithCrossSection = handle.connectedEdges
      .map((edge) => ({ edge, crossSectionMm2: edgeCrossSectionMm2(edge) }))
      .filter((item): item is { edge: Edge<EdgeDataType>; crossSectionMm2: number } => (
        item.crossSectionMm2 !== undefined
      ));
    if (connectedEdgesWithCrossSection.length === 0) return [];

    const totalCrossSectionMm2 = connectedEdgesWithCrossSection
      .reduce((sum, item) => sum + item.crossSectionMm2, 0);
    const absoluteLimit = handle.handle.maxCrossSectionAbsolute;
    const warningLimit = handle.handle.maxCrossSectionWarning;
    const isMultiple = connectedEdgesWithCrossSection.length > 1;
    const absoluteIssueKey = isMultiple
      ? 'pinTotalCrossSectionTooLarge'
      : 'pinWireCrossSectionTooLarge';
    const warningIssueKey = isMultiple
      ? 'pinTotalCrossSectionDifficult'
      : 'pinWireCrossSectionDifficult';
    const targets = [
      handleNodeTarget(handle),
      ...connectedEdgesWithCrossSection.map((item) => edgeTarget(item.edge, [handle.node])),
    ];
    const values = {
      handle: describeHandle(handle),
      total: formatMm2(totalCrossSectionMm2),
      limit: formatMm2(absoluteLimit ?? warningLimit ?? 0),
    };

    if (absoluteLimit !== undefined && totalCrossSectionMm2 > absoluteLimit) {
      return [translatedIssue(
        'network-rules',
        absoluteIssueKey,
        `pin-cross-section-too-large-${handle.key}`,
        'error',
        { ...values, limit: formatMm2(absoluteLimit) },
        targets,
        handleIssueOptions(handle, 'pin-cross-section-too-large', 80, 30, {
          suppressedBy: ['wire-connected-to-hidden-or-missing-handle'],
        }),
      )];
    }

    if (warningLimit !== undefined && totalCrossSectionMm2 > warningLimit) {
      return [translatedIssue(
        'network-rules',
        warningIssueKey,
        `pin-cross-section-warning-${handle.key}`,
        'warning',
        { ...values, limit: formatMm2(warningLimit) },
        targets,
        handleIssueOptions(handle, 'pin-cross-section-warning', 55, 105, {
          suppressedBy: ['wire-connected-to-hidden-or-missing-handle'],
        }),
      )];
    }

    return [];
  })
);

const checkMainsWireConnectedToLowVoltageComponent = (context: DiagramCheckContext) => (
  context.componentLinkedNets
    .filter((net) => netHasAnyClassification(net, ['L_net_type', 'N_net_type', 'PE_net_type']))
    .flatMap((net) => net.handles
      .filter((handle) => !hasMainsFunction(handle))
      .filter((handle) => isTechnicalComponent(handle.node))
      .filter((handle) => !isPassiveConnectorComponent(handle.node))
      .map((handle) => ({ net, handle })))
    .map(({ net, handle }) => translatedIssue(
      'network-rules',
      'mainsWireConnectedToLowVoltageComponent',
      `mains-wire-connected-to-low-voltage-component-${handle.key}`,
      'error',
      { component: componentName(handle.node), handle: describeComponentHandle(handle) },
      [
        ...handleTargets(handle),
        ...netTargets(net),
      ],
      handleIssueOptions(handle, 'mains-wire-connected-to-low-voltage-component', 95, 4, {
        suppresses: ['mixed-classification'],
      }),
    ))
);

const checkGroundAndSupplyPolaritySwapped = (net: CheckNet) => (
  translatedIssue(
    'network-rules',
    'groundAndSupplyPolaritySwapped',
    `network-ground-and-supply-polarity-swapped-${net.id}`,
    'error',
    undefined,
    netTargets(net),
    netIssueOptions(net, 'polarity-ground-supply', 95, 8, {
      suppresses: ['mixed-classification', 'supply-input-without-source', 'supply-source-without-consumer'],
    }),
  )
);

const checkSupplyVoltageUnknown = (context: DiagramCheckContext, net: CheckNet) => {
  const sources = independentSupplySources(context, net);
  if (sources.length !== 1) return undefined;
  if (context.resolveVoltageOut(sources[0].handles[0]) !== undefined) return undefined;

  const supplyInputs = handlesWithAnyFunction(net.handles, ['suppl_in'])
    .filter((handle) => !isUsbFull(handle));
  if (supplyInputs.length === 0) return undefined;

  return translatedIssue(
    'network-rules',
    'supplyVoltageUnknown',
    `network-supply-voltage-unknown-${net.id}`,
    'warning',
    { source: sources[0].handles.map(describeHandle).join(', ') },
    [
      ...netTargets(net),
      ...supplyInputs.flatMap(handleTargets),
      ...sources[0].handles.flatMap(handleTargets),
    ],
    netIssueOptions(net, 'supply-voltage-unknown', 55, 95, {
      suppressedBy: ['supply-voltage-mismatch', 'multiple-supply-sources'],
    }),
  );
};

const checkFuseBypassed = (context: DiagramCheckContext) => (
  context.nodes.flatMap((node) => (
    (node.data.internalConnections || [])
      .filter((connection) => connection.kind === 'fuse')
      .flatMap((connection) => {
        const fromHandle = context.getHandle(node.id, connection.fromHandle);
        const toHandle = context.getHandle(node.id, connection.toHandle);
        if (!fromHandle || !toHandle) return [];
        const fromNet = context.getComponentLinkedElementaryBasedNetByHandle(fromHandle);
        const toNet = context.getComponentLinkedElementaryBasedNetByHandle(toHandle);
        if (!fromNet || !toNet || fromNet.id !== toNet.id) return [];

        return [translatedIssue(
          'network-rules',
          'fuseBypassed',
          `fuse-bypassed-${node.id}-${connection.fromHandle}-${connection.toHandle}`,
          'error',
          { component: componentName(node) },
          [
            nodeTarget(node),
            ...netTargets(fromNet),
          ],
          netIssueOptions(fromNet, 'fuse-bypassed', 90, 18, {
            suppresses: ['duplicate-parallel-wire'],
          }),
        )];
      })
  ))
);

const digitalDataIn = (handles: CheckHandle[]) => handles.find((handle) => hasFunction(handle, 'dig_in'));
const digitalBackupIn = (handles: CheckHandle[]) => handles.find((handle) => hasFunction(handle, 'dig_backup_in'));
const digitalClockIn = (handles: CheckHandle[]) => handles.find((handle) => hasFunction(handle, 'dig_clock_in'));

const ledInputGroupKey = (handleId: string) => {
  const repeatedMiddleMatch = handleId.match(/_middle_\d+$/);
  if (repeatedMiddleMatch) return repeatedMiddleMatch[0].slice(1);

  const fixedPositionMatch = handleId.match(/_(start|end)$/);
  return fixedPositionMatch ? fixedPositionMatch[1] : undefined;
};

const ledUpstreamDataSource = (context: DiagramCheckContext, dataIn: CheckHandle) => {
  const sources = digitalSignalSourcesForInput(context, dataIn)
    .filter((source) => source.node.id !== dataIn.node.id)
    .filter((source) => source.node.data.group === 'led')
    .filter((source) => hasFunction(source, 'dig_out'));

  return sources.length === 1 ? sources[0] : undefined;
};

const isFirstLedBackupInputTiedToGround = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => {
  if (handle.node.data.group !== 'led' || !hasFunction(handle, 'dig_backup_in')) return false;

  const backupNet = context.getNetByHandle(handle);
  if (!backupNet?.classifications.includes('gnd_net_type')) return false;

  const nodeHandles = context.handles.filter((candidate) => candidate.node.id === handle.node.id);
  const dataIn = digitalDataIn(nodeHandles);

  return Boolean(dataIn && !ledUpstreamDataSource(context, dataIn));
};

const hasResolvedDigitalSink = (context: DiagramCheckContext, handle: CheckHandle) => (
  hasReachableDigitalSource(context, handle) ||
  hasValidDigitalBias(context, handle) ||
  isFirstLedBackupInputTiedToGround(context, handle)
);

type ClockedLedClockMissingReason =
  | 'unconnected'
  | 'ledChainMismatch'
  | 'sameAsData'
  | 'supply'
  | 'groundOrBias'
  | 'noDigitalSource'
  | 'ledDataOrBackupNet'
  | 'differentController'
  | 'noControllerOrigin';

const clockedLedClockMissingIssue = (
  reason: ClockedLedClockMissingReason,
  node: Node<ComponentDataType>,
  dataIn: CheckHandle,
  clockIn: CheckHandle,
  targets: DiagramCheckTarget[] = [],
) => translatedIssue(
  'network-rules',
  'clockedLedClockMissing',
  `clocked-led-clock-missing-${clockIn.key}`,
  'error',
  {
    component: componentName(node),
    reason: checkText(`rules.network-rules.issues.clockedLedClockMissing.reasons.${reason}`),
  },
  [
    ...handleTargets(dataIn),
    ...handleTargets(clockIn),
    ...targets,
  ],
  handleIssueOptions(clockIn, 'clocked-led-clock-missing', 85, 46, {
    suppresses: ['digital-sink-without-source'],
  }),
);

const checkDigitalBackupPairMismatch = (context: DiagramCheckContext) => {
  const issues: DiagramCheckIssue[] = [];

  handlesByNode(context).forEach((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || node.data.group !== 'led') return;

    const dataIn = digitalDataIn(nodeHandles);
    const backupIn = digitalBackupIn(nodeHandles);
    if (!dataIn || !backupIn) return;

    const backupNet = context.getNetByHandle(backupIn);
    const upstreamData = ledUpstreamDataSource(context, dataIn);
    if (upstreamData) {
      const upstreamBackupOut = context.handles.find((handle) => (
        handle.node.id === upstreamData.node.id && hasFunction(handle, 'dig_backup_out')
      ));
      const hasMatchingBackup = Boolean(upstreamBackupOut && backupNet?.handles.some((handle) => handle.key === upstreamBackupOut.key));
      if (hasMatchingBackup) return;

      issues.push(translatedIssue(
        'network-rules',
        'digitalBackupPairMismatch',
        `digital-backup-pair-mismatch-${backupIn.key}`,
        'error',
        {
          component: componentName(node),
          source: componentName(upstreamData.node),
        },
        [
          ...handleTargets(dataIn),
          ...handleTargets(backupIn),
          ...handleTargets(upstreamData),
          ...(upstreamBackupOut ? handleTargets(upstreamBackupOut) : []),
        ],
        handleIssueOptions(backupIn, 'digital-backup-pair-mismatch', 75, 70, {
          suppresses: ['digital-sink-without-source'],
        }),
      ));
      return;
    }

    if (backupNet?.classifications.includes('gnd_net_type')) return;
    const dataNet = context.getNetByHandle(dataIn);
    const backupInDataNet = Boolean(dataNet && backupNet && dataNet.id === backupNet.id);

    issues.push(translatedIssue(
      'network-rules',
      backupInDataNet ? 'digitalBackupInputTiedToData' : 'digitalBackupInputNotGrounded',
      backupInDataNet
        ? `digital-backup-input-tied-to-data-${backupIn.key}`
        : `digital-backup-input-not-grounded-${backupIn.key}`,
      backupInDataNet ? 'warning' : 'error',
      { component: componentName(node) },
      [
        ...handleTargets(dataIn),
        ...handleTargets(backupIn),
      ],
      handleIssueOptions(
        backupIn,
        backupInDataNet ? 'digital-backup-input-tied-to-data' : 'digital-backup-input-not-grounded',
        75,
        70,
      ),
    ));
  });

  return issues;
};

const checkClockedLedClockMissing = (context: DiagramCheckContext) => {
  const issues: DiagramCheckIssue[] = [];

  handlesByNode(context).forEach((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || node.data.group !== 'led') return;

    const dataIn = digitalDataIn(nodeHandles);
    const clockIn = digitalClockIn(nodeHandles);
    if (!dataIn || !clockIn || dataIn.connectedEdges.length === 0) return;

    if (clockIn.connectedEdges.length === 0) {
      issues.push(clockedLedClockMissingIssue('unconnected', node, dataIn, clockIn));
      return;
    }

    const upstreamData = ledUpstreamDataSource(context, dataIn);
    if (upstreamData) {
      const upstreamClockOut = context.handles.find((handle) => (
        handle.node.id === upstreamData.node.id && hasFunction(handle, 'dig_clock_out')
      ));
      const hasMatchingClock = Boolean(upstreamClockOut && signalPathContainsHandle(context, clockIn, upstreamClockOut));
      if (hasMatchingClock) return;

      issues.push(clockedLedClockMissingIssue(
        'ledChainMismatch',
        node,
        dataIn,
        clockIn,
        [
          ...handleTargets(upstreamData),
          ...(upstreamClockOut ? handleTargets(upstreamClockOut) : []),
        ],
      ));
      return;
    }

    if (signalPathContainsHandle(context, dataIn, clockIn)) {
      issues.push(clockedLedClockMissingIssue('sameAsData', node, dataIn, clockIn));
      return;
    }

    if (pathHasSupply(context, clockIn)) {
      issues.push(clockedLedClockMissingIssue('supply', node, dataIn, clockIn));
      return;
    }

    if (pathHasGroundOrBias(context, clockIn)) {
      issues.push(clockedLedClockMissingIssue('groundOrBias', node, dataIn, clockIn));
      return;
    }

    const clockSources = digitalSourcesForSignalInput(context, clockIn);
    if (clockSources.length === 0) {
      issues.push(clockedLedClockMissingIssue('noDigitalSource', node, dataIn, clockIn));
      return;
    }

    const ledDataOrBackupSinks = pathLedDataOrBackupSinks(context, clockIn);
    if (ledDataOrBackupSinks.length > 0) {
      issues.push(clockedLedClockMissingIssue(
        'ledDataOrBackupNet',
        node,
        dataIn,
        clockIn,
        ledDataOrBackupSinks.flatMap(handleTargets),
      ));
      return;
    }

    const dataSources = digitalSourcesForSignalInput(context, dataIn, ['dig_out']);
    const dataOrigins = dataSources
      .map((source) => resolveLogicalDigitalOrigin(context, source))
      .filter((origin): origin is CheckHandle => Boolean(origin));
    const clockOrigins = clockSources
      .map((source) => resolveLogicalDigitalOrigin(context, source))
      .filter((origin): origin is CheckHandle => Boolean(origin));
    const uniqueDataOriginIds = [...new Set(dataOrigins.map((origin) => origin.node.id))];
    const uniqueClockOriginIds = [...new Set(clockOrigins.map((origin) => origin.node.id))];

    if (uniqueDataOriginIds.length === 1) {
      if (uniqueClockOriginIds.length === 0) {
        issues.push(clockedLedClockMissingIssue('noControllerOrigin', node, dataIn, clockIn));
        return;
      }

      if (
        uniqueClockOriginIds.length === 1 &&
        uniqueClockOriginIds[0] !== uniqueDataOriginIds[0]
      ) {
        issues.push(clockedLedClockMissingIssue('differentController', node, dataIn, clockIn));
      }
    }
  });

  return issues;
};

const checkDigitalLedSignalGroupGroundMissing = (context: DiagramCheckContext) => {
  const issues: DiagramCheckIssue[] = [];

  handlesByNode(context).forEach((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || node.data.group !== 'led') return;

    const digitalSignalInputs = nodeHandles.filter((handle) => (
      (hasFunction(handle, 'dig_in') || hasFunction(handle, 'dig_clock_in')) &&
      handle.connectedEdges.length > 0
    ));
    if (digitalSignalInputs.length === 0) return;

    const gndHandlesByGroup = new Map<string, CheckHandle[]>();
    handlesWithAnyFunction(nodeHandles, ['gnd']).forEach((handle) => {
      const groupKey = ledInputGroupKey(handle.handle.hid);
      if (!groupKey) return;
      gndHandlesByGroup.set(groupKey, [...(gndHandlesByGroup.get(groupKey) || []), handle]);
    });

    const signalInputsByGroup = new Map<string, CheckHandle[]>();
    digitalSignalInputs.forEach((handle) => {
      const groupKey = ledInputGroupKey(handle.handle.hid);
      if (!groupKey) return;
      signalInputsByGroup.set(groupKey, [...(signalInputsByGroup.get(groupKey) || []), handle]);
    });

    signalInputsByGroup.forEach((signalInputs, groupKey) => {
      const gndHandles = gndHandlesByGroup.get(groupKey) || [];
      const hasConnectedGroupGround = gndHandles.some((handle) => handle.connectedEdges.length > 0);
      if (hasConnectedGroupGround) return;

      issues.push(translatedIssue(
        'component-rules',
        'digitalLedSignalGroupGroundMissing',
        `digital-led-signal-group-ground-missing-${node.id}-${groupKey}`,
        'error',
        {
          component: componentName(node),
          group: groupKey,
          signals: signalInputs.map(describeComponentHandle).join(', '),
        },
        [
          nodeTarget(node),
          ...signalInputs.flatMap(handleTargets),
          ...gndHandles.flatMap(handleTargets),
        ],
        {
          priority: 47,
          specificity: 85,
          fingerprint: {
            scope: 'component',
            key: `${node.id}:${groupKey}`,
            problem: 'digital-led-signal-group-ground-missing',
          },
          suppressedBy: ['ground-missing'],
        },
      ));
    });
  });

  return issues;
};

const checkSignalOutputWithoutConsumer = (context: DiagramCheckContext) => (
  context.componentLinkedNets.flatMap((net) => (
    signalRuleDefinitions.flatMap((definition) => {
      if (!net.classifications.includes(definition.classification)) return [];
      const sources = effectiveSignalSourcesForNet(context, net, definition);
      const sinks = effectiveSignalSinksForNet(context, net, definition);
      return sources
        .filter((source) => source.connectedEdges.length > 0)
        .filter((source) => (
          !sinks.some((candidate) => candidate.key !== source.key)
        ))
        .map((source) => translatedIssue(
          'network-rules',
          'signalOutputWithoutConsumer',
          `signal-output-without-consumer-${source.key}`,
          'warning',
          { signal: signalLabel(definition.id), source: describeHandle(source) },
          [
            ...handleTargets(source),
            ...netTargets(net),
          ],
          handleIssueOptions(source, `${definition.id}-output-without-consumer`, 50, 125, {
            suppressedBy: ['data-direction-wrong', 'mixed-digital-signal-types'],
          }),
        ));
    })
  ))
);

const checkDataDirectionWrong = (context: DiagramCheckContext) => (
  context.componentLinkedNets
    .filter((net) => net.classifications.includes('digital_net_type'))
    .flatMap((net) => {
      const dataSources = net.handles.filter((handle) => (
        hasFunction(handle, 'dig_out') && !hasFunction(handle, 'dig_in')
      ));
      const dataSinks = net.handles.filter((handle) => (
        hasFunction(handle, 'dig_in') && !hasFunction(handle, 'dig_out')
      ));
      if (dataSources.length > 1 && dataSinks.length === 0) {
        return [translatedIssue(
          'network-rules',
          'dataDirectionWrong',
          `data-direction-wrong-output-only-${net.id}`,
          'error',
          { handles: dataSources.map(describeHandle).join(', ') },
          [
            ...netTargets(net),
            ...dataSources.flatMap(handleTargets),
          ],
          netIssueOptions(net, 'data-direction-wrong', 80, 48, {
            suppresses: ['multiple-digital-sources', 'digital-output-without-consumer'],
          }),
        )];
      }
      if (dataSources.length === 0 && dataSinks.length > 1) {
        return [translatedIssue(
          'network-rules',
          'dataDirectionWrong',
          `data-direction-wrong-input-only-${net.id}`,
          'error',
          { handles: dataSinks.map(describeHandle).join(', ') },
          [
            ...netTargets(net),
            ...dataSinks.flatMap(handleTargets),
          ],
          netIssueOptions(net, 'data-direction-wrong', 80, 48, {
            suppresses: ['digital-sink-without-source'],
          }),
        )];
      }
      return [];
    })
);

const shortConnectedHandles = (
  nodeHandles: CheckHandle[],
  startHandleId: string,
) => {
  const handles = new Map(nodeHandles.map((handle) => [handle.handle.hid, handle]));
  const node = nodeHandles[0]?.node;
  const visited = new Set<string>();
  const queue = [startHandleId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    (node?.data.internalConnections || [])
      .filter((connection) => connection.kind === 'short')
      .flatMap((connection) => {
        if (connection.fromHandle === current) return [connection.toHandle];
        if (connection.toHandle === current) return [connection.fromHandle];
        return [];
      })
      .filter((handleId) => !visited.has(handleId))
      .forEach((handleId) => queue.push(handleId));
  }

  return Array.from(visited.values())
    .map((handleId) => handles.get(handleId))
    .filter((handle): handle is CheckHandle => Boolean(handle));
};

const checkControlledOutputWithoutControlInput = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node) return [];

    return nodeHandles
      .filter((output) => (
        Boolean(output.handle.controllableBy) &&
        output.connectedEdges.length > 0 &&
        Boolean(context.getNetByHandle(output))
      ))
      .flatMap((output) => {
        const controlHandleId = output.handle.controllableBy;
        if (!controlHandleId) return [];

        const controlHandles = shortConnectedHandles(nodeHandles, controlHandleId);
        const hasDigitalControl = controlHandles.some((control) => (
          handleHasDigitalSourceCapableNet(context, control)
        ));
        if (hasDigitalControl) return [];

        const controlLabel = controlHandles.length > 0
          ? controlHandles.map(describeComponentHandle).join(', ')
          : controlHandleId;
        const controlNetTargets = controlHandles
          .map((control) => context.getNetByHandle(control))
          .filter((net): net is CheckNet => Boolean(net))
          .flatMap(netTargets);

        return [translatedIssue(
          'component-rules',
          'controlledOutputWithoutControlInput',
          `controlled-output-without-control-input-${output.key}`,
          'error',
          {
            component: componentName(node),
            output: describeComponentHandle(output),
            control: controlLabel,
          },
          [
            nodeTarget(node),
            ...handleTargets(output),
            ...controlHandles.flatMap(handleTargets),
            ...controlNetTargets,
          ],
          handleIssueOptions(output, 'controlled-output-without-control-input', 85, 52),
        )];
      });
  })
);

const isAnalogLedStrip = (node: Node<ComponentDataType>) => (
  node.data.group === 'led' && node.data.technicalID.startsWith('AN_')
);

const checkAnalogLedColorChannelUnconnected = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || !isAnalogLedStrip(node) || !hasAnyConnectedEdge(nodeHandles)) return [];

    return analogLedColorChannels.flatMap((channel) => {
      const channelHandles = handlesWithAnyFunction(nodeHandles, [channel.fn]);
      if (channelHandles.length === 0) return [];
      if (channelHandles.some((handle) => handle.connectedEdges.length > 0)) return [];

      return [translatedIssue(
        'component-rules',
        'analogLedColorChannelUnconnected',
        `analog-led-color-channel-unconnected-${node.id}-${channel.id}`,
        'warning',
        {
          component: componentName(node),
          color: analogLedColorLabel(channel.id),
          handles: channelHandles.map(describeComponentHandle).join(', '),
        },
        [
          nodeTarget(node),
          ...channelHandles.flatMap(handleTargets),
        ],
        {
          priority: 85,
          specificity: 70,
          fingerprint: {
            scope: 'component',
            key: `${node.id}:${channel.id}`,
            problem: 'analog-led-color-channel-unconnected',
          },
        },
      )];
    });
  })
);

const pwmSourceHandlesForChannelHandle = (
  context: DiagramCheckContext,
  handle: CheckHandle,
) => (
  context.getNetByHandle(handle)?.sourceHandles.filter((source) => hasFunction(source, 'pwm_out')) || []
);

const checkAnalogLedColorChannelMultiplePwmSignals = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || !isAnalogLedStrip(node)) return [];

    return analogLedColorChannels.flatMap((channel) => {
      const channelHandles = handlesWithAnyFunction(nodeHandles, [channel.fn]);
      const connectedChannelHandles = channelHandles.filter((handle) => handle.connectedEdges.length > 0);
      if (connectedChannelHandles.length === 0) return [];

      const pwmSourcesByKey = new Map<string, CheckHandle>();
      const affectedNetsById = new Map<string, CheckNet>();

      connectedChannelHandles.forEach((handle) => {
        const net = context.getNetByHandle(handle);
        if (net) affectedNetsById.set(net.id, net);

        pwmSourceHandlesForChannelHandle(context, handle).forEach((source) => {
          pwmSourcesByKey.set(source.key, source);
        });
      });

      const pwmSources = Array.from(pwmSourcesByKey.values());
      if (pwmSources.length <= 1) return [];

      return [translatedIssue(
        'component-rules',
        'analogLedColorChannelMultiplePwmSignals',
        `analog-led-color-channel-multiple-pwm-signals-${node.id}-${channel.id}`,
        'error',
        {
          component: componentName(node),
          color: analogLedColorLabel(channel.id),
          signals: pwmSources.map(describeHandle).join(', '),
          handles: connectedChannelHandles.map(describeComponentHandle).join(', '),
        },
        [
          nodeTarget(node),
          ...connectedChannelHandles.flatMap(handleTargets),
          ...pwmSources.flatMap(handleTargets),
          ...Array.from(affectedNetsById.values()).flatMap(netTargets),
        ],
        {
          priority: 44,
          specificity: 90,
          fingerprint: {
            scope: 'component',
            key: `${node.id}:${channel.id}`,
            problem: 'analog-led-color-channel-multiple-pwm-signals',
          },
          suppresses: ['multiple-pwm-sources'],
        },
      )];
    });
  })
);

const fuseNominalValueIsMissing = (node: Node<ComponentDataType>, fieldId?: string) => {
  if (!fieldId) return true;

  const inputValue = node.data.inputFields?.find((field) => field.technicalID === fieldId)?.value;
  if (typeof inputValue === 'number' && inputValue > 0) return false;

  const selectValue = node.data.selectFields?.find((field) => field.technicalID === fieldId)?.selectedValue;
  return !(typeof selectValue === 'number' && selectValue > 0);
};

const checkFuseCurrentMissingOrUnderspecified = (context: DiagramCheckContext) => (
  context.nodes.flatMap((node) => {
    const fuseConnections = (node.data.internalConnections || []).filter((connection) => connection.kind === 'fuse');
    if (fuseConnections.length === 0) return [];

    const missingConnections = fuseConnections.filter((connection) => (
      typeof connection.nominalCurrent !== 'number' &&
      fuseNominalValueIsMissing(node, connection.nominalCurrentField || connection.fuseId)
    ));
    if (missingConnections.length === 0) return [];

    return [translatedIssue(
      'component-rules',
      'fuseCurrentMissingOrUnderspecified',
      `fuse-current-missing-or-underspecified-${node.id}`,
      'info',
      { component: componentName(node) },
      [nodeTarget(node)],
      componentIssueOptions(node, 'fuse-current-missing-or-underspecified', 45, 160),
    )];
  })
);

const checkComponentHasOnlyOneTerminalConnected = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || !isTechnicalComponent(node) || isPassiveConnectorComponent(node)) return [];
    if (!['Resistor', 'Kerko', 'Elko', 'miniOTOFuse'].includes(node.data.technicalID)) return [];
    if (nodeHandles.length !== 2) return [];

    const connectedHandles = nodeHandles.filter((handle) => handle.connectedEdges.length > 0);
    if (connectedHandles.length !== 1) return [];

    return [translatedIssue(
      'component-rules',
      'componentHasOnlyOneTerminalConnected',
      `component-has-only-one-terminal-connected-${node.id}`,
      'warning',
      { component: componentName(node), handle: describeComponentHandle(connectedHandles[0]) },
      [
        nodeTarget(node),
        ...nodeHandles.flatMap(handleTargets),
      ],
      componentIssueOptions(node, 'component-has-only-one-terminal-connected', 65, 110, {
        suppressedBy: ['required-pin-unconnected'],
      }),
    )];
  })
);

const checkCapacitorPolarityMismatch = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || node.data.technicalID !== 'Elko') return [];

    const plus = nodeHandles.find((handle) => handle.handle.hid.toLowerCase().includes('plus'));
    const minus = nodeHandles.find((handle) => handle.handle.hid.toLowerCase().includes('minus'));
    if (!plus || !minus) return [];

    const plusNet = context.getNetByHandle(plus);
    const minusNet = context.getNetByHandle(minus);
    const plusWrong = plusNet?.classifications.includes('gnd_net_type') || false;
    const minusWrong = minusNet?.classifications.includes('suppl_net_type') || false;
    if (!plusWrong && !minusWrong) return [];

    return [translatedIssue(
      'component-rules',
      'capacitorPolarityMismatch',
      `capacitor-polarity-mismatch-${node.id}`,
      'error',
      { component: componentName(node) },
      [
        nodeTarget(node),
        ...handleTargets(plus),
        ...handleTargets(minus),
      ],
      componentIssueOptions(node, 'capacitor-polarity-mismatch', 90, 34, {
        suppresses: ['mixed-classification'],
      }),
    )];
  })
);

const checkMainsConnectorIncomplete = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node) return [];
    const lineHandles = handlesWithAnyFunction(nodeHandles, ['line_in']);
    const neutralHandles = handlesWithAnyFunction(nodeHandles, ['neutral_in']);
    if (lineHandles.length === 0 || neutralHandles.length === 0) return [];

    const lineOk = lineHandles.some((handle) => handleNetHasClassification(context, handle, 'L_net_type'));
    const neutralOk = neutralHandles.some((handle) => handleNetHasClassification(context, handle, 'N_net_type'));
    if (lineOk === neutralOk) return [];

    return [translatedIssue(
      'component-rules',
      'mainsConnectorIncomplete',
      `mains-connector-incomplete-${node.id}`,
      'error',
      { component: componentName(node) },
      [
        nodeTarget(node),
        ...lineHandles.flatMap(handleTargets),
        ...neutralHandles.flatMap(handleTargets),
      ],
      componentIssueOptions(node, 'mains-connector-incomplete', 75, 14, {
        suppresses: ['mains-input-missing'],
      }),
    )];
  })
);

const checkProtectiveEarthMissingForMetalOrMainsDevice = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node) return [];

    const peHandles = handlesWithAnyFunction(nodeHandles, ['pe_in']);
    if (peHandles.length === 0) return [];

    const mainsUsed = handlesWithAnyFunction(nodeHandles, ['line_in', 'neutral_in'])
      .some((handle) => handle.connectedEdges.length > 0 || handleNetHasClassification(context, handle, 'L_net_type') || handleNetHasClassification(context, handle, 'N_net_type'));
    if (!mainsUsed) return [];

    const peOk = peHandles.some((handle) => handleNetHasClassification(context, handle, 'PE_net_type'));
    if (peOk) return [];

    return [translatedIssue(
      'component-rules',
      'protectiveEarthMissingForMetalOrMainsDevice',
      `protective-earth-missing-${node.id}`,
      'error',
      { component: componentName(node) },
      [
        nodeTarget(node),
        ...peHandles.flatMap(handleTargets),
      ],
      componentIssueOptions(node, 'protective-earth-missing', 80, 16, {
        suppresses: ['mains-input-missing'],
      }),
    )];
  })
);

const checkIsolatedComponent = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || !isTechnicalComponent(node)) return [];
    if (hasAnyConnectedEdge(nodeHandles)) return [];

    return [translatedIssue(
      'component-rules',
      'isolatedComponent',
      `isolated-component-${node.id}`,
      'info',
      { component: componentName(node) },
      [nodeTarget(node)],
      componentIssueOptions(node, 'isolated-component', 30, 180),
    )];
  })
);

const hasCheckRelevantFunction = (handle: CheckHandle) => (
  handle.functions.some((fn) => fn !== 'unknown' && fn !== 'not_connected')
);

const checkComponentDefinitionIncompleteForChecks = (context: DiagramCheckContext) => (
  context.handles
    .filter((handle) => (
      handle.rawFunctions.length === 0 ||
      (hasFunction(handle, 'suppl_in') && (handle.voltageMin === undefined || handle.voltageMax === undefined)) ||
      ((hasFunction(handle, 'suppl_out') || hasFunction(handle, 'dig_out') || hasFunction(handle, 'dig_clock_out') || hasFunction(handle, 'dig_backup_out')) &&
        context.resolveVoltageOut(handle) === undefined)
    ))
    .map((handle) => translatedIssue(
      'component-rules',
      'componentDefinitionIncompleteForChecks',
      `component-definition-incomplete-for-checks-${handle.key}`,
      'info',
      { component: componentName(handle.node), handle: describeComponentHandle(handle) },
      handleTargets(handle),
      handleIssueOptions(handle, 'component-definition-incomplete-for-checks', 60, 900, {
        diagnosticOnly: true,
      }),
    ))
);

const allowedMultiFunctionSets = new Set([
  ['dig_in', 'dig_out'].sort().join('|'),
  ['dig_in', 'dig_out', 'an_in'].sort().join('|'),
  ['dig_clock_in', 'dig_clock_out'].sort().join('|'),
  ['dig_backup_in', 'dig_backup_out'].sort().join('|'),
  ['dig_in', 'an_in'].sort().join('|'),
]);

const checkAmbiguousMultiFunctionHandle = (context: DiagramCheckContext) => (
  context.handles
    .filter((handle) => handle.functions.filter((fn) => fn !== 'unknown').length > 1)
    .filter(hasCheckRelevantFunction)
    .filter((handle) => !allowedMultiFunctionSets.has(handle.functions.slice().sort().join('|')))
    .map((handle) => translatedIssue(
      'component-rules',
      'ambiguousMultiFunctionHandle',
      `ambiguous-multi-function-handle-${handle.key}`,
      'info',
      {
        handle: describeHandle(handle),
        functions: handle.functions.join(', '),
      },
      handleTargets(handle),
      handleIssueOptions(handle, 'ambiguous-multi-function-handle', 60, 910, {
        diagnosticOnly: true,
      }),
    ))
);

const checkUnusedRequiredFunctionalGroup = (context: DiagramCheckContext) => (
  Array.from(handlesByNode(context).values()).flatMap((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node || node.data.group !== 'led') return [];

    const dataIn = digitalDataIn(nodeHandles);
    const hasLedInputUse = Boolean(dataIn && dataIn.connectedEdges.length > 0);
    if (!hasLedInputUse) return [];

    const supplyInputs = handlesWithAnyFunction(nodeHandles, ['suppl_in']);
    const gndInputs = handlesWithAnyFunction(nodeHandles, ['gnd']);
    const missingRequired = [
      ...(!supplyInputs.some((handle) => handle.connectedEdges.length > 0 || handleNetHasClassification(context, handle, 'suppl_net_type')) ? supplyInputs : []),
      ...(!gndInputs.some((handle) => handle.connectedEdges.length > 0 || handleNetHasClassification(context, handle, 'gnd_net_type')) ? gndInputs : []),
    ];
    if (missingRequired.length === 0) return [];

    return [translatedIssue(
      'component-rules',
      'unusedRequiredFunctionalGroup',
      `unused-required-functional-group-${node.id}`,
      'warning',
      { component: componentName(node) },
      [
        nodeTarget(node),
        ...(dataIn ? handleTargets(dataIn) : []),
        ...missingRequired.flatMap(handleTargets),
      ],
      componentIssueOptions(node, 'unused-required-functional-group', 80, 75, {
        suppresses: ['power-missing', 'ground-missing'],
      }),
    )];
  })
);

const runNetworkRules = (context: DiagramCheckContext, settings: DiagramCheckSettings) => {
  const issues: DiagramCheckIssue[] = [
    ...checkWireConnectedToHiddenOrMissingHandle(context),
    ...checkDuplicateParallelWires(context),
    ...checkWireWithoutPhysicalParameters(context),
    ...checkWireProtectionRules(context, settings.wireAmpacity),
    ...checkPinCrossSectionLimit(context),
    ...checkMainsWireConnectedToLowVoltageComponent(context),
    ...checkFuseBypassed(context),
  ];
  const priorityBlockedNetIds = new Set<string>();
  const componentLinkedNets = context.componentLinkedNets;
  const gndHandles = context.handles.filter((handle) => hasFunction(handle, 'gnd'));
  const gndNets = componentLinkedNets.filter((net) => net.classifications.includes('gnd_net_type'));
  const gndHandlesWithoutUsbPower = gndHandles.filter((handle) => (
    !nodeHasValidUsbPowerConnection(context, handle.node.id) &&
    !nodeHasInvalidUsbPowerConnection(context, handle.node.id)
  ));

  if (gndHandlesWithoutUsbPower.length > 0 && gndNets.length === 0) {
    issues.push(translatedIssue(
      'network-rules',
      'groundMissing',
      'network-ground-missing',
      'error',
      undefined,
      gndHandlesWithoutUsbPower.flatMap(handleTargets),
      diagramIssueOptions('ground-missing', 50, 30),
    ));
  }

  if (gndNets.length >= 2) {
    gndNets.forEach((net) => priorityBlockedNetIds.add(net.id));
    issues.push(translatedIssue(
      'network-rules',
      'groundMultiple',
      'network-ground-multiple',
      'error',
      { count: gndNets.length },
      gndNets.flatMap(netTargets),
      diagramIssueOptions('ground-multiple', 70, 20),
    ));
  }

  componentLinkedNets
    .filter((net) => (
      net.classifications.includes('gnd_net_type') &&
      net.classifications.includes('suppl_net_type')
    ))
    .forEach((net) => {
      priorityBlockedNetIds.add(net.id);
      issues.push(checkGroundAndSupplyPolaritySwapped(net));
    });

  componentLinkedNets
    .filter((net) => (
      netHasAnyClassification(net, ['L_net_type', 'N_net_type']) &&
      netHasAnyClassification(net, lowVoltageOrSignalClassifications)
    ))
    .forEach((net) => {
      priorityBlockedNetIds.add(net.id);
      issues.push(translatedIssue(
        'network-rules',
        'mainsLowVoltageMixed',
        `network-mains-low-voltage-mixed-${net.id}`,
        'error',
        { classifications: net.classifications.map(classificationLabel).join(', ') },
        netTargets(net),
        netIssueOptions(net, 'mains-low-voltage-mixed', 90, 5, {
          suppresses: ['mixed-classification'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => (
      net.classifications.includes('PE_net_type') &&
      netHasAnyClassification(net, activeOrSignalClassifications)
    ))
    .forEach((net) => {
      priorityBlockedNetIds.add(net.id);
      issues.push(translatedIssue(
        'network-rules',
        'peActiveMixed',
        `network-pe-active-mixed-${net.id}`,
        'error',
        { classifications: net.classifications.map(classificationLabel).join(', ') },
        netTargets(net),
        netIssueOptions(net, 'pe-active-mixed', 90, 6, {
          suppresses: ['mixed-classification'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => (
      net.classifications.includes('rs485_a_net_type') &&
      net.classifications.includes('rs485_b_net_type')
    ))
    .forEach((net) => {
      priorityBlockedNetIds.add(net.id);
      issues.push(translatedIssue(
        'network-rules',
        'rs485Mixed',
        `network-rs485-a-b-mixed-${net.id}`,
        'error',
        undefined,
        netTargets(net),
        netIssueOptions(net, 'rs485-mixed', 80, 25, {
          suppresses: ['mixed-classification'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => net.classifications.includes('usb_net_type'))
    .forEach((net) => {
      const reasons = usbPowerPairInvalidReasons(net);
      if(reasons.length === 0) return;

      priorityBlockedNetIds.add(net.id);
      issues.push(translatedIssue(
        'network-rules',
        'usbPowerPairInvalid',
        `network-usb-power-pair-invalid-${net.id}`,
        'error',
        {
          reason: reasons.join('; '),
        },
        netTargets(net),
        netIssueOptions(net, 'usb-power-pair-invalid', 80, 39, {
          suppresses: ['usb-sink-without-source', 'multiple-usb-sources', 'mixed-classification'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => net.classifications.length > 1)
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      priorityBlockedNetIds.add(net.id);
      issues.push(translatedIssue(
        'network-rules',
        'mixedClassifications',
        `network-mixed-classifications-${net.id}`,
        'error',
        { classifications: net.classifications.map(classificationLabel).join(', ') },
        netTargets(net),
        netIssueOptions(net, 'mixed-classification', 20, 80, {
          suppressedBy: ['mains-low-voltage-mixed', 'pe-active-mixed', 'rs485-mixed'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => net.classifications.includes('suppl_net_type'))
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      const sources = independentSupplySources(context, net);
      if (sources.length <= 1) return;

      issues.push(translatedIssue(
        'network-rules',
        'multipleSupplySources',
        `network-multiple-supply-sources-${net.id}`,
        'error',
        {
          count: sources.length,
          sources: sources.map((source) => source.handles.map(describeHandle).join(' / ')).join('; '),
        },
        [
          ...netTargets(net),
          ...sources.flatMap((source) => source.handles.flatMap(handleTargets)),
        ],
        netIssueOptions(net, 'multiple-supply-sources', 70, 35, {
          suppresses: ['supply-voltage-mismatch', 'supply-source-without-consumer'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      signalRuleDefinitions.forEach((definition) => {
        if(definition.id === 'usb' && !net.classifications.includes('usb_net_type')) return;

        const sinks = effectiveSignalSinksForNet(context, net, definition)
          .filter((handle) => isFirstSinkDefinitionForHandle(handle, definition))
          .filter((handle) => !hasResolvedRoleForOtherSignal(context, net, handle, definition));
        const unresolvedSinks = definition.id === 'digital'
          ? sinks.filter((handle) => !hasResolvedDigitalSink(context, handle))
          : sinks;

        if (unresolvedSinks.length === 0 || net.classifications.includes(definition.classification)) return;

        issues.push(translatedIssue(
          'network-rules',
          'signalSinkWithoutSource',
          `network-${definition.id}-sink-without-source-${net.id}`,
          'error',
          {
            signal: signalLabel(definition.id),
            sinks: unresolvedSinks.map(describeHandle).join(', '),
          },
          [
            ...netTargets(net),
            ...unresolvedSinks.flatMap(handleTargets),
          ],
          netIssueOptions(net, `${definition.id}-sink-without-source`, 60, 50, {
            suppressedBy: ['mixed-digital-signal-types', 'data-direction-wrong'],
          }),
        ));
      });
    });

  componentLinkedNets
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      const digitalDefinition = signalRuleDefinitions.find((definition) => definition.id === 'digital');
      if (!digitalDefinition) return;

      const sources = effectiveSignalSourcesForNet(context, net, digitalDefinition);
      const inputs = effectiveSignalSinksForNet(context, net, digitalDefinition);
      inputs.forEach((input) => {
        const inputSources = sources.filter((source) => (
          source.key !== input.key && source.node.id !== input.node.id
        ));
        if (!shouldCheckDigitalSignalVoltage(net, inputSources)) return;

        const mismatches = inputSources
          .map((source) => ({
            source,
            voltage: context.resolveVoltageOut(source),
          }))
          .map((source) => ({
            ...source,
            reason: digitalVoltageMismatchReason(source.voltage, input),
          }))
          .filter((source): source is {
            source: CheckHandle;
            voltage: number;
            reason: 'low' | 'high';
          } => source.reason !== undefined && source.voltage !== undefined);

        if (mismatches.length === 0) return;

        const min = input.voltageMin !== undefined ? formatVoltage(input.voltageMin) : '?';
        const max = input.voltageMax !== undefined ? formatVoltage(input.voltageMax) : '?';
        const mismatchDescription = mismatches
          .map((mismatch) => `${describeHandle(mismatch.source)} (${formatVoltage(mismatch.voltage)} V)`)
          .join(', ');

        issues.push(translatedIssue(
          'network-rules',
          'digitalSignalVoltageMismatch',
          `network-digital-signal-voltage-mismatch-${input.key}`,
          'error',
          {
            input: describeHandle(input),
            min,
            max,
            sources: mismatchDescription,
          },
          [
            ...handleTargets(input),
            ...mismatches.flatMap((mismatch) => handleTargets(mismatch.source)),
          ],
          handleIssueOptions(input, 'digital-signal-voltage-mismatch', 75, 45),
        ));
      });
    });

  componentLinkedNets
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      signalRuleDefinitions.forEach((definition) => {
        if (!net.classifications.includes(definition.classification)) return;

        const sources = effectiveSignalSourcesForNet(context, net, definition);
        if (sources.length <= 1) return;

        issues.push(translatedIssue(
          'network-rules',
          'multipleSignalSources',
          `network-multiple-${definition.id}-sources-${net.id}`,
          'error',
          {
            signal: signalLabel(definition.id),
            sources: sources.map(describeHandle).join(', '),
          },
          [
            ...netTargets(net),
            ...sources.flatMap(handleTargets),
          ],
          netIssueOptions(net, `multiple-${definition.id}-sources`, 65, 55, {
            suppressedBy: ['mixed-digital-signal-types', 'data-direction-wrong'],
          }),
        ));
      });
    });

  componentLinkedNets
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      const supplyInputs = handlesWithAnyFunction(net.handles, ['suppl_in'])
        .filter((handle) => !isUsbFull(handle));
      const supplySources = net.classifications.includes('suppl_net_type')
        ? independentSupplySources(context, net)
        : [];

      if (supplyInputs.length > 0 && supplySources.length === 0) {
        issues.push(translatedIssue(
          'network-rules',
          'supplyInputWithoutSource',
          `network-supply-input-without-source-${net.id}`,
          'error',
          { inputs: supplyInputs.map(describeHandle).join(', ') },
          [
            ...netTargets(net),
            ...supplyInputs.flatMap(handleTargets),
          ],
          netIssueOptions(net, 'supply-input-without-source', 60, 40),
        ));
      }

      if (
        net.classifications.includes('suppl_net_type') &&
        supplyInputs.length === 0 &&
        !hasDigitalBiasConsumer(context, net)
      ) {
        issues.push(translatedIssue(
          'network-rules',
          'supplySourceWithoutConsumer',
          `network-supply-source-without-consumer-${net.id}`,
          'warning',
          undefined,
          netTargets(net),
          netIssueOptions(net, 'supply-source-without-consumer', 45, 120, {
            suppressedBy: [
              'mixed-classification',
              'mains-low-voltage-mixed',
              'pe-active-mixed',
              'multiple-supply-sources',
              'supply-voltage-mismatch',
            ],
          }),
        ));
      }
    });

  componentLinkedNets
    .filter((net) => net.classifications.includes('suppl_net_type'))
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      const sources = independentSupplySources(context, net);
      if (sources.length !== 1) return;

      const sourceVoltage = context.resolveVoltageOut(sources[0].handles[0]);
      if (sourceVoltage === undefined) return;

      const mismatchedInputs = net.handles
        .filter((handle) => hasVoltageTolerance(handle))
        .filter((handle) => !isUsbFull(handle))
        .filter((handle) => !isPassiveConnectorComponent(handle.node))
        .filter((handle) => !voltageMatchesHandleTolerance(sourceVoltage, handle));
      if (mismatchedInputs.length === 0) return;

      issues.push(translatedIssue(
        'network-rules',
        'supplyVoltageMismatch',
        `network-supply-voltage-mismatch-${net.id}`,
        'error',
        {
          voltage: formatVoltage(sourceVoltage),
          inputs: mismatchedInputs.map(describeHandle).join(', '),
        },
        [
          ...netTargets(net),
          ...sources[0].handles.flatMap(handleTargets),
          ...mismatchedInputs.flatMap(handleTargets),
        ],
        netIssueOptions(net, 'supply-voltage-mismatch', 75, 42, {
          suppressedBy: ['multiple-supply-sources'],
        }),
      ));
    });

  componentLinkedNets
    .filter((net) => net.classifications.includes('usb_net_type'))
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .filter(isValidUsbPowerPairNet)
    .forEach((net) => {
      const source = usbPowerSources(net)[0];
      const sourceVoltage = context.resolveVoltageOut(source);
      if(sourceVoltage === undefined) return;

      const mismatchedInputs = usbPowerSinks(net)
        .filter((handle) => hasVoltageTolerance(handle))
        .filter((handle) => !voltageMatchesHandleTolerance(sourceVoltage, handle));
      if(mismatchedInputs.length === 0) return;

      issues.push(translatedIssue(
        'network-rules',
        'supplyVoltageMismatch',
        `network-usb-supply-voltage-mismatch-${net.id}`,
        'error',
        {
          voltage: formatVoltage(sourceVoltage),
          inputs: mismatchedInputs.map(describeHandle).join(', '),
        },
        [
          ...netTargets(net),
          ...handleTargets(source),
          ...mismatchedInputs.flatMap(handleTargets),
        ],
        netIssueOptions(net, 'supply-voltage-mismatch', 75, 42),
      ));
    });

  componentLinkedNets
    .filter((net) => net.classifications.includes('suppl_net_type'))
    .filter((net) => !priorityBlockedNetIds.has(net.id))
    .forEach((net) => {
      const issueForNet = checkSupplyVoltageUnknown(context, net);
      if (issueForNet) issues.push(issueForNet);
    });

  issues.push(
    ...checkClockedLedClockMissing(context),
    ...checkDigitalBackupPairMismatch(context),
    ...checkDataDirectionWrong(context),
    ...checkSignalOutputWithoutConsumer(context),
  );

  return issues;
};

const runComponentRules = (context: DiagramCheckContext) => {
  const issues: DiagramCheckIssue[] = [];
  const mainsInputRequirements: {
    id: string;
    label: string;
    inputFunction: string;
    classification: CheckNetClassification;
  }[] = [
    {
      id: 'line',
      label: 'Line',
      inputFunction: 'line_in',
      classification: 'L_net_type',
    },
    {
      id: 'neutral',
      label: 'Neutral',
      inputFunction: 'neutral_in',
      classification: 'N_net_type',
    },
    {
      id: 'pe',
      label: 'PE',
      inputFunction: 'pe_in',
      classification: 'PE_net_type',
    },
  ];

  handlesByNode(context).forEach((nodeHandles) => {
    const node = nodeHandles[0]?.node;
    if (!node) return;

    const requiredDisconnectedHandles = nodeHandles.filter((handle) => (
      handle.handle.mustBeConnected === true &&
      handle.connectedEdges.length === 0
    ));

    if (requiredDisconnectedHandles.length > 0) {
      issues.push(translatedIssue(
        'component-rules',
        'requiredPinUnconnected',
        `component-required-pin-unconnected-${node.id}`,
        'error',
        {
          component: componentName(node),
          handles: requiredDisconnectedHandles.map(describeComponentHandle).join(', '),
        },
        [
          nodeTarget(node),
          ...requiredDisconnectedHandles.flatMap(handleTargets),
        ],
        componentIssueOptions(node, 'required-pin-unconnected', 70, 32),
      ));
    }

    const gndHandles = handlesWithAnyFunction(nodeHandles, ['gnd']);
    const usbFullHandles = handlesWithAnyFunction(nodeHandles, ['usb_full']);
    const hasUsbConnection = usbFullHandles.some((handle) => (
      isValidUsbPowerPairNet(context.getNetByHandle(handle))
    ));
    const hasInvalidUsbConnection = usbFullHandles.some((handle) => (
      isInvalidUsbPowerPairNet(context.getNetByHandle(handle))
    ));
    const hasGroundConnection = gndHandles.some((handle) => (
      handleNetHasClassification(context, handle, 'gnd_net_type')
    ));

    if (gndHandles.length > 0 && !hasGroundConnection && !hasUsbConnection && !hasInvalidUsbConnection) {
      issues.push(translatedIssue(
        'component-rules',
        'groundMissing',
        `component-ground-missing-${node.id}`,
        'error',
        { component: componentName(node) },
        [
          nodeTarget(node),
          ...gndHandles.flatMap(handleTargets),
        ],
        componentIssueOptions(node, 'ground-missing', 55, 60),
      ));
    }

    const supplyInputHandles = nodeHandles.filter((handle) => (
      hasFunction(handle, 'suppl_in') && !hasFunction(handle, 'usb_full')
    ));
    const hasSupplyNeed = supplyInputHandles.length > 0 || usbFullHandles.length > 0;
    const hasSupplyConnection = supplyInputHandles.some((handle) => (
      supplyInputHasExternalSource(context, handle)
    ));
    const connectedSupplyInputsWithoutSource = supplyInputHandles.filter((handle) => (
      handle.connectedEdges.length > 0 && !supplyInputHasExternalSource(context, handle)
    ));
    const preferSupplyNetIssue = (
      connectedSupplyInputsWithoutSource.length > 0 &&
      !hasSupplyConnection &&
      !hasUsbConnection &&
      !hasInvalidUsbConnection
    );

    if (
      hasSupplyNeed &&
      !hasSupplyConnection &&
      !hasUsbConnection &&
      !hasInvalidUsbConnection &&
      !preferSupplyNetIssue
    ) {
      issues.push(translatedIssue(
        'component-rules',
        'powerMissing',
        `component-power-missing-${node.id}`,
        'error',
        { component: componentName(node) },
        [
          nodeTarget(node),
          ...supplyInputHandles.flatMap(handleTargets),
          ...usbFullHandles.flatMap(handleTargets),
        ],
        componentIssueOptions(node, 'power-missing', 55, 58),
      ));
    }

    mainsInputRequirements.forEach((requirement) => {
      const inputHandles = handlesWithAnyFunction(nodeHandles, [requirement.inputFunction]);
      const missingHandles = inputHandles.filter((handle) => (
        !handleNetHasClassification(context, handle, requirement.classification)
      ));

      if (missingHandles.length === 0) return;

      issues.push(translatedIssue(
        'component-rules',
        'mainsInputMissing',
        `component-${requirement.id}-input-missing-${node.id}`,
        'error',
        {
          component: componentName(node),
          label: mainsInputLabel(requirement.id),
        },
        [
          nodeTarget(node),
          ...missingHandles.flatMap(handleTargets),
        ],
        {
          priority: 12,
          specificity: 70,
          fingerprint: {
            scope: 'component',
            key: `${node.id}:${requirement.id}`,
            problem: 'mains-input-missing',
          },
        },
      ));
    });
  });

  return [
    ...issues,
    ...checkUnusedRequiredFunctionalGroup(context),
    ...checkDigitalLedSignalGroupGroundMissing(context),
    ...checkControlledOutputWithoutControlInput(context),
    ...checkAnalogLedColorChannelUnconnected(context),
    ...checkAnalogLedColorChannelMultiplePwmSignals(context),
    ...checkComponentHasOnlyOneTerminalConnected(context),
    ...checkCapacitorPolarityMismatch(context),
    ...checkMainsConnectorIncomplete(context),
    ...checkProtectiveEarthMissingForMetalOrMainsDevice(context),
    ...checkFuseCurrentMissingOrUnderspecified(context),
    ...checkIsolatedComponent(context),
    ...checkComponentDefinitionIncompleteForChecks(context),
    ...checkAmbiguousMultiFunctionHandle(context),
    ...runComponentSpecificRules(context),
  ];
};

export const diagramCheckRules: DiagramCheckRule[] = [
  {
    id: 'network-rules',
    get title() { return ruleText('network-rules', 'title'); },
    get description() { return ruleText('network-rules', 'description'); },
    issueKeys: [
      'groundMissing',
      'groundMultiple',
      'wireConnectedToHiddenOrMissingHandle',
      'mainsWireConnectedToLowVoltageComponent',
      'mainsLowVoltageMixed',
      'peActiveMixed',
      'rs485Mixed',
      'groundAndSupplyPolaritySwapped',
      'mixedClassifications',
      'multipleSupplySources',
      'usbPowerPairInvalid',
      'supplyVoltageUnknown',
      'signalSinkWithoutSource',
      'digitalSignalVoltageMismatch',
      'multipleSignalSources',
      'signalOutputWithoutConsumer',
      'dataDirectionWrong',
      'clockedLedClockMissing',
      'digitalBackupPairMismatch',
      'digitalBackupInputTiedToData',
      'digitalBackupInputNotGrounded',
      'supplyInputWithoutSource',
      'supplySourceWithoutConsumer',
      'supplyVoltageMismatch',
      'fuseBypassed',
      'wireWithoutPhysicalParameters',
      'sourceWireCrossSectionTooSmall',
      'sourceGroundWireCrossSectionTooSmall',
      'unfusedSupplyWireCrossSectionTooSmall',
      'fusedSupplyWireCrossSectionTooSmall',
      'ledSupplyInputNotAdequatelyProtected',
      'componentGroundWireCrossSectionSmallerThanSupply',
      'ledGroundWireCrossSectionSmallerThanSupply',
      'connectorGroundWireCrossSectionSmallerThanBranch',
      'pinWireCrossSectionTooLarge',
      'pinTotalCrossSectionTooLarge',
      'pinWireCrossSectionDifficult',
      'pinTotalCrossSectionDifficult',
      'duplicateParallelWire',
    ],
    check: runNetworkRules,
  },
  {
    id: 'component-rules',
    get title() { return ruleText('component-rules', 'title'); },
    get description() { return ruleText('component-rules', 'description'); },
    issueKeys: [
      'requiredPinUnconnected',
      'groundMissing',
      'powerMissing',
      'mainsInputMissing',
      'unusedRequiredFunctionalGroup',
      'digitalLedSignalGroupGroundMissing',
      'controlledOutputWithoutControlInput',
      'analogLedColorChannelUnconnected',
      'analogLedColorChannelMultiplePwmSignals',
      'componentHasOnlyOneTerminalConnected',
      'capacitorPolarityMismatch',
      'mainsConnectorIncomplete',
      'protectiveEarthMissingForMetalOrMainsDevice',
      'fuseCurrentMissingOrUnderspecified',
      'isolatedComponent',
      'componentDefinitionIncompleteForChecks',
      'ambiguousMultiFunctionHandle',
      'sn74Ahct125nUsedChannelInputMissing',
      'sn74Ahct125nDirectLedOutputMissingSeriesResistor',
    ],
    check: runComponentRules,
  },
];

export const getDiagramCheckRuleInfos = () => diagramCheckRules.map(ruleInfo);
