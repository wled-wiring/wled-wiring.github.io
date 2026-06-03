import type { Edge, Node } from '@xyflow/react';

import i18next from '../i18n';
import type { ComponentDataType, ComponentInternalConnectionType, EdgeDataType } from '../types';
import { getComponentDisplayName } from '../utils/componentDisplayName';
import { readableWireLabel } from '../utils/wireLabel';
import {
  wireAmpacityA,
  type WireAmpacitySettings,
} from '../wires/wireAmpacity';
import type { CheckHandle, CheckNet, DiagramCheckContext } from './checkContext';
import { describeHandle } from './checkContext';
import type { DiagramCheckIssue, DiagramCheckIssueFingerprint, DiagramCheckTarget } from './diagramCheckTypes';

const AMPACITY_TOLERANCE_A = 0.01;
const CROSSSECTION_TOLERANCE_MM2 = 0.0001;
const ENABLE_CONNECTOR_GROUND_BACKBONE_CHECK = true;
const ENABLE_COMPONENT_GROUND_CROSSSECTION_CHECK = true;

type EvaluatedWire = {
  edge: Edge<EdgeDataType>;
  ampacityA: number;
  crosssectionMm2: number;
};

type SourceLimit = {
  nodeId: string;
  sourceCurrentA: number;
  requiredCurrentA: number;
};

type FuseBoundary = {
  nodeId: string;
  fromHandleId: string;
  toHandleId: string;
  fromNetId: string;
  toNetId: string;
  nominalCurrentA?: number;
};

type SourceDiscovery = {
  directSourceEdgeIds: Set<string>;
  directGroundSourceEdgeIds: Set<string>;
  directSourceEdgeRequiredA: Map<string, number>;
  directSourceNetRequiredA: Map<string, number>;
  sourceNetLimits: Map<string, SourceLimit[]>;
};

const checkText = (key: string, values?: Record<string, number | string | undefined>) => (
  String(i18next.t(`sidebar.check.${key}`, { ns: 'main', ...values }))
);

const issueText = (
  issueKey: string,
  field: 'title' | 'shortDescription' | 'description' | 'recommendation',
  values?: Record<string, number | string | undefined>,
) => checkText(`rules.network-rules.issues.${issueKey}.${field}`, values);

const componentName = (node: Node<ComponentDataType>) => getComponentDisplayName(node.data, node.id);

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

const handleNodeTarget = (handle: CheckHandle): DiagramCheckTarget => ({
  ...nodeTarget(handle.node),
  handleId: handle.handle.hid,
});

const issueOptions = (
  scope: DiagramCheckIssueFingerprint['scope'],
  key: string,
  problem: string,
  specificity: number,
  priority: number,
): Pick<DiagramCheckIssue, 'fingerprint' | 'specificity' | 'priority'> => ({
  priority,
  specificity,
  fingerprint: {
    scope,
    key,
    problem,
  },
});

const translatedIssue = (
  issueKey: string,
  id: string,
  severity: DiagramCheckIssue['severity'],
  values: Record<string, number | string | undefined> | undefined,
  targets: DiagramCheckTarget[],
  options: Pick<DiagramCheckIssue, 'fingerprint' | 'specificity' | 'priority'>,
): DiagramCheckIssue => ({
  id,
  ruleId: 'network-rules',
  severity,
  ...options,
  title: issueText(issueKey, 'title', values),
  shortDescription: issueText(issueKey, 'shortDescription', values),
  description: issueText(issueKey, 'description', values),
  recommendation: issueText(issueKey, 'recommendation', values),
  targets,
});

const hasFunction = (handle: CheckHandle, fn: string) => handle.functions.includes(fn as never);

const hasAnyFunction = (handle: CheckHandle, functions: string[]) => (
  functions.some((fn) => hasFunction(handle, fn))
);

const isPureConnector = (node: Node<ComponentDataType>) => (
  ['SolderJoint', 'WAGO_2X', 'WAGO_3X'].includes(node.data.technicalID)
);

const getNodeFieldNumber = (node: Node<ComponentDataType>, technicalId: string) => {
  const inputValue = node.data.inputFields?.find((field) => field.technicalID === technicalId || field.technicalID === technicalId)?.value;
  if (typeof inputValue === 'number' && Number.isFinite(inputValue)) return inputValue;

  const selectValue = node.data.selectFields?.find((field) => field.technicalID === technicalId)?.selectedValue;
  return typeof selectValue === 'number' && Number.isFinite(selectValue) ? selectValue : undefined;
};

const resolveFuseNominalCurrentA = (
  node: Node<ComponentDataType>,
  connection: Extract<ComponentInternalConnectionType, { kind: 'fuse' }>,
) => {
  if (typeof connection.nominalCurrent === 'number' && connection.nominalCurrent > 0) {
    return connection.nominalCurrent;
  }

  const fieldId = connection.nominalCurrentField || connection.fuseId;
  if (!fieldId) return undefined;

  const inputValue = node.data.inputFields?.find((field) => field.technicalID === fieldId)?.value;
  if (typeof inputValue === 'number' && inputValue > 0) return inputValue;

  const selectValue = node.data.selectFields?.find((field) => field.technicalID === fieldId)?.selectedValue;
  return typeof selectValue === 'number' && selectValue > 0 ? selectValue : undefined;
};

const netHasSupplyClassification = (net: CheckNet | undefined) => (
  Boolean(net && (
    net.classifications.includes('suppl_net_type') ||
    net.classifications.includes('usb_net_type')
  ))
);

const netHasGroundClassification = (net: CheckNet | undefined) => (
  Boolean(net && net.classifications.includes('gnd_net_type'))
);

const edgeNetLookup = (nets: CheckNet[]) => {
  const byEdgeId = new Map<string, CheckNet>();
  nets.forEach((net) => {
    net.edges.forEach((edge) => byEdgeId.set(edge.id, net));
  });
  return byEdgeId;
};

const endpointsForEdge = (context: DiagramCheckContext, edge: Edge<EdgeDataType>) => {
  const source = context.getHandle(edge.source, edge.sourceHandle);
  const target = context.getHandle(edge.target, edge.targetHandle);
  return [source, target].filter((handle): handle is CheckHandle => Boolean(handle));
};

const otherEndpoint = (
  context: DiagramCheckContext,
  edge: Edge<EdgeDataType>,
  handle: CheckHandle,
) => endpointsForEdge(context, edge).find((candidate) => candidate.key !== handle.key);

const evaluatedWire = (
  edge: Edge<EdgeDataType>,
  settings: WireAmpacitySettings,
): EvaluatedWire | undefined => {
  const result = wireAmpacityA(
    edge.data?.physCrosssection,
    edge.data?.physCrosssectionUnit,
    settings.installation,
    settings.ambientTempC,
    edge.data?.physType,
  );

  return result.ok
    ? {
        edge,
        ampacityA: result.ampacityA,
        crosssectionMm2: result.crosssectionMm2,
      }
    : undefined;
};

const formatLocalizedFixed = (value: number, fractionDigits: number) => (
  new Intl.NumberFormat(i18next.resolvedLanguage || i18next.language, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
);

const formatAmp = (value: number) => formatLocalizedFixed(value, 2);
const formatMm2 = (value: number) => String(Number(value.toFixed(3)));

const addDirectSourceEdge = (
  edge: Edge<EdgeDataType>,
  source: SourceLimit,
  edgeNetById: Map<string, CheckNet>,
  discovery: SourceDiscovery,
  options: {
    isRelevantNet: (net: CheckNet | undefined) => boolean;
    addSourceNetLimit?: boolean;
    isGroundSourceEdge?: boolean;
  },
) => {
  const net = edgeNetById.get(edge.id);
  if (!options.isRelevantNet(net) || !net) return;

  discovery.directSourceEdgeIds.add(edge.id);
  if (options.isGroundSourceEdge) {
    discovery.directGroundSourceEdgeIds.add(edge.id);
  }
  discovery.directSourceEdgeRequiredA.set(
    edge.id,
    Math.max(discovery.directSourceEdgeRequiredA.get(edge.id) || 0, source.requiredCurrentA),
  );
  discovery.directSourceNetRequiredA.set(
    net.id,
    Math.max(discovery.directSourceNetRequiredA.get(net.id) || 0, source.requiredCurrentA),
  );
  if (options.addSourceNetLimit !== false) {
    discovery.sourceNetLimits.set(net.id, [...(discovery.sourceNetLimits.get(net.id) || []), source]);
  }
};

const markSupplyConnectorSourceArea = (
  context: DiagramCheckContext,
  sourceHandle: CheckHandle,
  source: SourceLimit,
  edgeNetById: Map<string, CheckNet>,
  discovery: SourceDiscovery,
) => {
  const visitedHandles = new Set<string>();
  const queue = [sourceHandle];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visitedHandles.has(current.key)) continue;
    visitedHandles.add(current.key);

    current.connectedEdges.forEach((edge) => {
      const net = edgeNetById.get(edge.id);
      if (!netHasSupplyClassification(net)) return;

      addDirectSourceEdge(edge, source, edgeNetById, discovery, {
        isRelevantNet: netHasSupplyClassification,
      });

      const other = otherEndpoint(context, edge, current);
      if (!other || !isPureConnector(other.node)) return;

      context.handles
        .filter((handle) => handle.node.id === other.node.id)
        .forEach((handle) => {
          if (!visitedHandles.has(handle.key)) queue.push(handle);
        });
    });
  }
};

const discoverSources = (
  context: DiagramCheckContext,
  supplyEdgeNetById: Map<string, CheckNet>,
  groundEdgeNetById: Map<string, CheckNet>,
): SourceDiscovery => {
  const discovery: SourceDiscovery = {
    directSourceEdgeIds: new Set<string>(),
    directGroundSourceEdgeIds: new Set<string>(),
    directSourceEdgeRequiredA: new Map<string, number>(),
    directSourceNetRequiredA: new Map<string, number>(),
    sourceNetLimits: new Map<string, SourceLimit[]>(),
  };

  context.nodes.forEach((node) => {
    const sourceCurrentA = getNodeFieldNumber(node, 'source_current');
    if (sourceCurrentA === undefined || sourceCurrentA <= 0) return;

    const source: SourceLimit = {
      nodeId: node.id,
      sourceCurrentA,
      requiredCurrentA: 1.25 * sourceCurrentA,
    };

    const sourceHandles = context.handles.filter((handle) => handle.node.id === node.id);
    sourceHandles
      .filter((handle) => hasAnyFunction(handle, ['suppl_out', 'usb_power_out']))
      .forEach((handle) => markSupplyConnectorSourceArea(context, handle, source, supplyEdgeNetById, discovery));

    sourceHandles
      .filter((handle) => hasFunction(handle, 'gnd'))
      .forEach((handle) => {
        handle.connectedEdges.forEach((edge) => addDirectSourceEdge(edge, source, groundEdgeNetById, discovery, {
          isRelevantNet: netHasGroundClassification,
          addSourceNetLimit: false,
          isGroundSourceEdge: true,
        }));
      });
  });

  return discovery;
};

const fuseBoundaries = (
  context: DiagramCheckContext,
): FuseBoundary[] => (
  context.nodes.flatMap((node) => (
    (node.data.internalConnections || [])
      .filter((connection): connection is Extract<ComponentInternalConnectionType, { kind: 'fuse' }> => connection.kind === 'fuse')
      .flatMap((connection) => {
        const fromHandle = context.getHandle(node.id, connection.fromHandle);
        const toHandle = context.getHandle(node.id, connection.toHandle);
        if (!fromHandle || !toHandle) return [];

        const fromNet = context.getComponentLinkedElementaryBasedNetByHandle(fromHandle);
        const toNet = context.getComponentLinkedElementaryBasedNetByHandle(toHandle);
        if (!fromNet || !toNet || fromNet.id === toNet.id) return [];

        return [{
          nodeId: node.id,
          fromHandleId: connection.fromHandle,
          toHandleId: connection.toHandle,
          fromNetId: fromNet.id,
          toNetId: toNet.id,
          nominalCurrentA: resolveFuseNominalCurrentA(node, connection),
        }];
      })
  ))
);

const fuseGraph = (boundaries: FuseBoundary[]) => {
  const graph = new Map<string, { nextNetId: string; fuse: FuseBoundary }[]>();
  boundaries.forEach((fuse) => {
    graph.set(fuse.fromNetId, [...(graph.get(fuse.fromNetId) || []), { nextNetId: fuse.toNetId, fuse }]);
    graph.set(fuse.toNetId, [...(graph.get(fuse.toNetId) || []), { nextNetId: fuse.fromNetId, fuse }]);
  });
  return graph;
};

const hasUnsafePathToSourceForAmpacity = (
  startNetId: string,
  ampacityA: number,
  graph: Map<string, { nextNetId: string; fuse: FuseBoundary }[]>,
  sourceNetIds: Set<string>,
) => {
  const queue = [{ netId: startNetId, protectedOnPath: false, undecidable: false }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const key = `${current.netId}:${current.protectedOnPath}:${current.undecidable}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (sourceNetIds.has(current.netId)) {
      if (!current.protectedOnPath && !current.undecidable) return true;
      continue;
    }

    (graph.get(current.netId) || []).forEach(({ nextNetId, fuse }) => {
      if (fuse.nominalCurrentA === undefined) {
        queue.push({ netId: nextNetId, protectedOnPath: current.protectedOnPath, undecidable: true });
        return;
      }

      queue.push({
        netId: nextNetId,
        protectedOnPath: current.protectedOnPath || fuse.nominalCurrentA <= ampacityA + AMPACITY_TOLERANCE_A,
        undecidable: current.undecidable,
      });
    });
  }

  return false;
};

const hasUnsafePathToSourceForLimit = (
  startNetId: string,
  limitA: number,
  graph: Map<string, { nextNetId: string; fuse: FuseBoundary }[]>,
  sourceNetLimits: Map<string, SourceLimit[]>,
) => {
  const queue = [{ netId: startNetId, protectedOnPath: false, undecidable: false }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const key = `${current.netId}:${current.protectedOnPath}:${current.undecidable}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const limits = sourceNetLimits.get(current.netId) || [];
    if (limits.length > 0) {
      if (
        !current.protectedOnPath &&
        !current.undecidable &&
        limits.some((source) => limitA + AMPACITY_TOLERANCE_A < source.requiredCurrentA)
      ) {
        return true;
      }
      continue;
    }

    (graph.get(current.netId) || []).forEach(({ nextNetId, fuse }) => {
      if (fuse.nominalCurrentA === undefined) {
        queue.push({ netId: nextNetId, protectedOnPath: current.protectedOnPath, undecidable: true });
        return;
      }

      queue.push({
        netId: nextNetId,
        protectedOnPath: current.protectedOnPath || fuse.nominalCurrentA <= limitA + AMPACITY_TOLERANCE_A,
        undecidable: current.undecidable,
      });
    });
  }

  return false;
};

const checkSourceAndSupplyProtection = (
  context: DiagramCheckContext,
  settings: WireAmpacitySettings,
  discovery: SourceDiscovery,
  graph: Map<string, { nextNetId: string; fuse: FuseBoundary }[]>,
) => {
  const issues: DiagramCheckIssue[] = [];
  const sourceNetIds = new Set(discovery.sourceNetLimits.keys());
  const issueEdgeKeys = new Set<string>();

  discovery.directSourceEdgeIds.forEach((edgeId) => {
    const edge = context.edges.find((candidate) => candidate.id === edgeId);
    const evaluated = edge ? evaluatedWire(edge, settings) : undefined;
    const requiredA = discovery.directSourceEdgeRequiredA.get(edgeId);
    if (!edge || !evaluated || requiredA === undefined) return;
    if (evaluated.ampacityA + AMPACITY_TOLERANCE_A >= requiredA) return;

    const key = `source:${edge.id}`;
    if (issueEdgeKeys.has(key)) return;
    issueEdgeKeys.add(key);
    const isGroundSourceEdge = discovery.directGroundSourceEdgeIds.has(edge.id);
    issues.push(translatedIssue(
      isGroundSourceEdge ? 'sourceGroundWireCrossSectionTooSmall' : 'sourceWireCrossSectionTooSmall',
      `source-wire-cross-section-too-small-${edge.id}`,
      isGroundSourceEdge ? 'warning' : 'error',
      { ampacity: formatAmp(evaluated.ampacityA), required: formatAmp(requiredA) },
      [edgeTarget(edge)],
      issueOptions(
        'edge',
        edge.id,
        isGroundSourceEdge ? 'source-ground-wire-cross-section-too-small' : 'source-wire-cross-section-too-small',
        85,
        25,
      ),
    ));
  });

  context.componentLinkedElementaryBasedNets
    .filter((net) => net.classifications.includes('suppl_net_type'))
    .forEach((net) => {
      const directRequiredA = discovery.directSourceNetRequiredA.get(net.id);

      if (directRequiredA !== undefined) {
        net.edges
          .filter((edge) => !discovery.directSourceEdgeIds.has(edge.id))
          .forEach((edge) => {
            const evaluated = evaluatedWire(edge, settings);
            if (!evaluated || evaluated.ampacityA + AMPACITY_TOLERANCE_A >= directRequiredA) return;

            issues.push(translatedIssue(
              'unfusedSupplyWireCrossSectionTooSmall',
              `unfused-supply-wire-cross-section-too-small-${edge.id}`,
              'error',
              { ampacity: formatAmp(evaluated.ampacityA), required: formatAmp(directRequiredA) },
              [edgeTarget(edge)],
              issueOptions('edge', edge.id, 'unfused-supply-wire-cross-section-too-small', 82, 28),
            ));
          });
        return;
      }

      net.edges.forEach((edge) => {
        const evaluated = evaluatedWire(edge, settings);
        if (!evaluated) return;
        if (!hasUnsafePathToSourceForAmpacity(net.id, evaluated.ampacityA, graph, sourceNetIds)) return;

        issues.push(translatedIssue(
          'fusedSupplyWireCrossSectionTooSmall',
          `fused-supply-wire-cross-section-too-small-${edge.id}`,
          'error',
          { ampacity: formatAmp(evaluated.ampacityA) },
          [edgeTarget(edge)],
          issueOptions('edge', edge.id, 'fused-supply-wire-cross-section-too-small', 82, 29),
        ));
      });
    });

  return issues;
};

const isDigitalLedStrip = (node: Node<ComponentDataType>) => (
  node.data.group === 'led' &&
  [...(node.data.handles || []), ...(node.data.repeatedHandleArray || [])].some((handle) => (
    handle.functions?.some((fn) => [
      'dig_in',
      'dig_out',
      'dig_clock_in',
      'dig_clock_out',
      'dig_backup_in',
      'dig_backup_out',
    ].includes(fn)) || false
  ))
);

const checkLedSupplyInputs = (
  context: DiagramCheckContext,
  discovery: SourceDiscovery,
  graph: Map<string, { nextNetId: string; fuse: FuseBoundary }[]>,
) => (
  context.handles
    .filter((handle) => isDigitalLedStrip(handle.node))
    .filter((handle) => hasFunction(handle, 'suppl_in'))
    .filter((handle) => typeof handle.handle.Imax === 'number' && handle.handle.Imax > 0)
    .flatMap((handle) => {
      const net = context.getComponentLinkedElementaryBasedNetByHandle(handle);
      const limitA = handle.handle.Imax;
      if (!net || limitA === undefined) return [];
      if (!hasUnsafePathToSourceForLimit(net.id, limitA, graph, discovery.sourceNetLimits)) return [];

      return [translatedIssue(
        'ledSupplyInputNotAdequatelyProtected',
        `led-supply-input-not-adequately-protected-${handle.key}`,
        'error',
        { input: describeHandle(handle), limit: formatAmp(limitA) },
        [handleNodeTarget(handle), ...handle.connectedEdges.map((edge) => edgeTarget(edge, [handle.node]))],
        issueOptions('handle', handle.key, 'led-supply-input-not-adequately-protected', 86, 27),
      )];
    })
);

const edgeCrosssectionMm2 = (
  edge: Edge<EdgeDataType>,
  settings: WireAmpacitySettings,
) => evaluatedWire(edge, settings)?.crosssectionMm2;

const maxRelatedSupplyCrosssectionMm2 = (
  context: DiagramCheckContext,
  handlesById: Map<string, CheckHandle>,
  gndHandle: CheckHandle,
  settings: WireAmpacitySettings,
) => {
  const relatedHandleIds = gndHandle.handle.relatedToHandle || [];
  if (relatedHandleIds.length === 0) return undefined;

  const relatedSupplyCrosssections = relatedHandleIds.flatMap((handleId) => {
    const relatedHandle = handlesById.get(handleId);
    if (!relatedHandle || !context.getNetByHandle(relatedHandle)?.classifications.includes('suppl_net_type')) {
      return [];
    }

    return relatedHandle.connectedEdges
      .map((edge) => edgeCrosssectionMm2(edge, settings))
      .filter((value): value is number => value !== undefined);
  });

  const maxCrosssectionMm2 = Math.max(0, ...relatedSupplyCrosssections);
  return maxCrosssectionMm2 > 0 ? maxCrosssectionMm2 : undefined;
};

const checkComponentGroundCrosssections = (
  context: DiagramCheckContext,
  settings: WireAmpacitySettings,
) => {
  if (!ENABLE_COMPONENT_GROUND_CROSSSECTION_CHECK) return [];

  return context.nodes
    .filter((node) => !isPureConnector(node))
    .filter((node) => node.data.group !== 'led')
    .flatMap((node) => {
      const handles = context.handles.filter((handle) => handle.node.id === node.id);
      const handlesById = new Map(handles.map((handle) => [handle.handle.hid, handle]));

      return handles
        .filter((handle) => hasFunction(handle, 'gnd'))
        .flatMap((handle) => {
          const maxSupplyMm2 = maxRelatedSupplyCrosssectionMm2(context, handlesById, handle, settings);
          if (maxSupplyMm2 === undefined) return [];

          return handle.connectedEdges
            .map((edge) => ({ handle, edge, maxSupplyMm2 }));
        })
        .filter(({ handle }) => context.getNetByHandle(handle)?.classifications.includes('gnd_net_type'))
        .flatMap(({ handle, edge, maxSupplyMm2 }) => {
          const crosssectionMm2 = edgeCrosssectionMm2(edge, settings);
          if (crosssectionMm2 === undefined || crosssectionMm2 + CROSSSECTION_TOLERANCE_MM2 >= maxSupplyMm2) return [];

          return [translatedIssue(
            'componentGroundWireCrossSectionSmallerThanSupply',
            `component-ground-wire-cross-section-smaller-than-supply-${edge.id}-${node.id}`,
            'warning',
            { crosssection: formatMm2(crosssectionMm2), required: formatMm2(maxSupplyMm2) },
            [nodeTarget(node), edgeTarget(edge, [node]), handleNodeTarget(handle)],
            issueOptions('edge', edge.id, 'component-ground-wire-cross-section-smaller-than-supply', 60, 100),
          )];
        });
    });
};

const ledConnectionArea = (handleId: string) => {
  if (handleId.endsWith('_start')) return 'start';
  if (handleId.endsWith('_end')) return 'end';

  const middleMatch = handleId.match(/_middle_(\d+)$/);
  return middleMatch ? `middle_${middleMatch[1]}` : undefined;
};

const ledAreaPosition = (area: string) => {
  if (area === 'start') return 0;
  if (area === 'end') return Number.MAX_SAFE_INTEGER;
  const middleMatch = area.match(/^middle_(\d+)$/);
  return middleMatch ? Number(middleMatch[1]) : undefined;
};

const nearestSupplyReference = (area: string | undefined, supplies: Map<string, number>) => {
  if (!area || supplies.size === 0) return undefined;
  const sameArea = supplies.get(area);
  if (sameArea !== undefined) return sameArea;

  const position = ledAreaPosition(area);
  if (position === undefined) return undefined;

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestCrosssectionMm2 = 0;
  supplies.forEach((crosssectionMm2, supplyArea) => {
    const supplyPosition = ledAreaPosition(supplyArea);
    if (supplyPosition === undefined) return;

    const distance = Math.abs(supplyPosition - position);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCrosssectionMm2 = crosssectionMm2;
      return;
    }
    if (distance === bestDistance) {
      bestCrosssectionMm2 = Math.max(bestCrosssectionMm2, crosssectionMm2);
    }
  });

  return bestCrosssectionMm2 > 0 ? bestCrosssectionMm2 : undefined;
};

const checkLedGroundCrosssections = (
  context: DiagramCheckContext,
  settings: WireAmpacitySettings,
) => (
  context.nodes
    .filter((node) => node.data.group === 'led')
    .flatMap((node) => {
      const handles = context.handles.filter((handle) => handle.node.id === node.id);
      const supplies = new Map<string, number>();

      handles
        .filter((handle) => hasFunction(handle, 'suppl_in'))
        .forEach((handle) => {
          const area = ledConnectionArea(handle.handle.hid);
          if (!area || !context.getNetByHandle(handle)?.classifications.includes('suppl_net_type')) return;

          const maxCrosssectionMm2 = Math.max(
            0,
            ...handle.connectedEdges
              .map((edge) => edgeCrosssectionMm2(edge, settings))
              .filter((value): value is number => value !== undefined),
          );
          if (maxCrosssectionMm2 > 0) {
            supplies.set(area, Math.max(supplies.get(area) || 0, maxCrosssectionMm2));
          }
        });

      return handles
        .filter((handle) => hasFunction(handle, 'gnd'))
        .flatMap((handle) => {
          const referenceMm2 = nearestSupplyReference(ledConnectionArea(handle.handle.hid), supplies);
          if (referenceMm2 === undefined) return [];

          return handle.connectedEdges.flatMap((edge) => {
            if (!context.getNetByHandle(handle)?.classifications.includes('gnd_net_type')) return [];

            const crosssectionMm2 = edgeCrosssectionMm2(edge, settings);
            if (crosssectionMm2 === undefined || crosssectionMm2 + CROSSSECTION_TOLERANCE_MM2 >= referenceMm2) return [];

            return [translatedIssue(
              'ledGroundWireCrossSectionSmallerThanSupply',
              `led-ground-wire-cross-section-smaller-than-supply-${edge.id}-${handle.key}`,
              'warning',
              { crosssection: formatMm2(crosssectionMm2), required: formatMm2(referenceMm2) },
              [nodeTarget(node), edgeTarget(edge, [node]), handleNodeTarget(handle)],
              issueOptions('edge', edge.id, 'led-ground-wire-cross-section-smaller-than-supply', 60, 101),
            )];
          });
        });
    })
);

const checkConnectorGroundBackbone = (
  context: DiagramCheckContext,
  settings: WireAmpacitySettings,
  directSourceEdgeIds: Set<string>,
) => {
  if (!ENABLE_CONNECTOR_GROUND_BACKBONE_CHECK) return [];

  const issues: DiagramCheckIssue[] = [];
  const connectorRequirements = new Map<string, number>();
  const connectorEdges = new Map<string, { otherConnectorId: string; edge: Edge<EdgeDataType> }[]>();

  context.edges.forEach((edge) => {
    const endpoints = endpointsForEdge(context, edge);
    if (endpoints.length !== 2) return;
    if (!endpoints.some((handle) => context.getNetByHandle(handle)?.classifications.includes('gnd_net_type'))) return;

    const [a, b] = endpoints;
    const aConnector = isPureConnector(a.node);
    const bConnector = isPureConnector(b.node);
    const crosssectionMm2 = edgeCrosssectionMm2(edge, settings);
    if (crosssectionMm2 === undefined) return;

    if (aConnector && bConnector) {
      connectorEdges.set(a.node.id, [...(connectorEdges.get(a.node.id) || []), { otherConnectorId: b.node.id, edge }]);
      connectorEdges.set(b.node.id, [...(connectorEdges.get(b.node.id) || []), { otherConnectorId: a.node.id, edge }]);
      return;
    }

    if (directSourceEdgeIds.has(edge.id)) return;

    if (aConnector && !bConnector) {
      connectorRequirements.set(a.node.id, Math.max(connectorRequirements.get(a.node.id) || 0, crosssectionMm2));
    }
    if (bConnector && !aConnector) {
      connectorRequirements.set(b.node.id, Math.max(connectorRequirements.get(b.node.id) || 0, crosssectionMm2));
    }
  });

  const queue = Array.from(connectorRequirements.entries()).map(([nodeId, requiredMm2]) => ({ nodeId, requiredMm2 }));
  const knownRequirements = new Map(connectorRequirements);
  const reportedEdges = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    (connectorEdges.get(current.nodeId) || []).forEach(({ otherConnectorId, edge }) => {
      const crosssectionMm2 = edgeCrosssectionMm2(edge, settings);
      if (crosssectionMm2 === undefined) return;

      if (crosssectionMm2 + CROSSSECTION_TOLERANCE_MM2 < current.requiredMm2 && !reportedEdges.has(edge.id)) {
        reportedEdges.add(edge.id);
        issues.push(translatedIssue(
          'connectorGroundWireCrossSectionSmallerThanBranch',
          `connector-ground-wire-cross-section-smaller-than-branch-${edge.id}`,
          'warning',
          { crosssection: formatMm2(crosssectionMm2), required: formatMm2(current.requiredMm2) },
          [edgeTarget(edge)],
          issueOptions('edge', edge.id, 'connector-ground-wire-cross-section-smaller-than-branch', 55, 115),
        ));
      }

      const nextRequiredMm2 = Math.max(current.requiredMm2, crosssectionMm2);
      if (nextRequiredMm2 <= (knownRequirements.get(otherConnectorId) || 0) + CROSSSECTION_TOLERANCE_MM2) return;

      knownRequirements.set(otherConnectorId, nextRequiredMm2);
      queue.push({ nodeId: otherConnectorId, requiredMm2: nextRequiredMm2 });
    });
  }

  return issues;
};

export const checkWireProtectionRules = (
  context: DiagramCheckContext,
  settings: WireAmpacitySettings,
) => {
  const edgeNetById = edgeNetLookup(context.componentLinkedElementaryBasedNets);
  const elementaryEdgeNetById = edgeNetLookup(context.elementaryNets);
  const sources = discoverSources(context, edgeNetById, elementaryEdgeNetById);
  const fuses = fuseGraph(fuseBoundaries(context));

  return [
    ...checkSourceAndSupplyProtection(context, settings, sources, fuses),
    ...checkLedSupplyInputs(context, sources, fuses),
    ...checkComponentGroundCrosssections(context, settings),
    ...checkLedGroundCrosssections(context, settings),
    ...checkConnectorGroundBackbone(context, settings, sources.directSourceEdgeIds),
  ];
};
