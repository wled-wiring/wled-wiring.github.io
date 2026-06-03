import type { Edge, Node } from '@xyflow/react';

import type { ComponentDataType, EdgeDataType, HandleDataType } from '../types';
import { getComponentDisplayName } from '../utils/componentDisplayName';

export type CheckHandleFunction = NonNullable<HandleDataType['functions']>[number] | 'unknown';

export type CheckNetLayer = 'elementary' | 'fused' | 'component-linked' | 'component-linked-elementary-based';

export type CheckNetClassification =
  | 'gnd_net_type'
  | 'suppl_net_type'
  | 'digital_net_type'
  | 'pwm_net_type'
  | 'analog_net_type'
  | 'audio_net_type'
  | 'eth_net_type'
  | 'usb_net_type'
  | 'rs485_a_net_type'
  | 'rs485_b_net_type'
  | 'N_net_type'
  | 'L_net_type'
  | 'PE_net_type';

export type CheckHandle = {
  key: string;
  node: Node<ComponentDataType>;
  handle: HandleDataType;
  rawFunctions: CheckHandleFunction[];
  functions: CheckHandleFunction[];
  connectedEdges: Edge<EdgeDataType>[];
  voltageOut?: number;
  voltageMin?: number;
  voltageMax?: number;
};

export type CheckNet = {
  id: string;
  layer: CheckNetLayer;
  childNetIds: string[];
  classifications: CheckNetClassification[];
  handles: CheckHandle[];
  edges: Edge<EdgeDataType>[];
  componentIds: string[];
  sourceHandles: CheckHandle[];
  sinkHandles: CheckHandle[];
};

export type CheckInvalidWire = {
  edge: Edge<EdgeDataType>;
  side: 'source' | 'target';
  node?: Node<ComponentDataType>;
  handleId?: string | null;
  reason: 'missing-node' | 'missing-handle' | 'hidden-handle';
};

export type DiagramCheckContext = {
  nodes: Node<ComponentDataType>[];
  edges: Edge<EdgeDataType>[];
  handles: CheckHandle[];
  nets: CheckNet[];
  elementaryNets: CheckNet[];
  fusedNets: CheckNet[];
  componentLinkedNets: CheckNet[];
  componentLinkedElementaryBasedNets: CheckNet[];
  invalidWires: CheckInvalidWire[];
  getHandle: (nodeId: string, handleId?: string | null) => CheckHandle | undefined;
  getNetByHandle: (handle: CheckHandle) => CheckNet | undefined;
  getElementaryNetByHandle: (handle: CheckHandle) => CheckNet | undefined;
  getFusedNetByHandle: (handle: CheckHandle) => CheckNet | undefined;
  getComponentLinkedElementaryBasedNetByHandle: (handle: CheckHandle) => CheckNet | undefined;
  hasFunction: (handle: CheckHandle, fn: CheckHandleFunction) => boolean;
  handlesWithFunction: (fn: CheckHandleFunction) => CheckHandle[];
  connectedHandles: (handle: CheckHandle) => CheckHandle[];
  resolveVoltageOut: (handle: CheckHandle) => number | undefined;
  powerReachableHandles: (handle: CheckHandle) => CheckHandle[];
  externallyPowerReachableHandles: (handle: CheckHandle) => CheckHandle[];
  signalReachableHandles: (handle: CheckHandle) => CheckHandle[];
};

const keyOf = (nodeId: string, handleId: string) => `${nodeId}::${handleId}`;

class UnionFind {
  private parent = new Map<string, string>();

  add(value: string) {
    if (!this.parent.has(value)) {
      this.parent.set(value, value);
    }
  }

  find(value: string): string {
    const parent = this.parent.get(value);
    if (!parent || parent === value) {
      return value;
    }
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string) {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

const getInputFieldValue = (node: Node<ComponentDataType>, technicalID: string) => (
  node.data.inputFields?.find((field) => field.technicalID === technicalID)?.value
);

const hasInputField = (node: Node<ComponentDataType>, technicalID?: string) => (
  Boolean(technicalID && node.data.inputFields?.some((field) => field.technicalID === technicalID))
);

const getNodeHandleById = (node: Node<ComponentDataType>, handleId: string) => (
  allVisibleHandles(node).find((handle) => handle.hid === handleId)
);

const isPassiveJoinNode = (node: Node<ComponentDataType>) => (
  ['SolderJoint', 'WAGO_2X', 'WAGO_3X'].includes(node.data.technicalID)
);

const isHiddenByCondition = (node: Node<ComponentDataType>, handle: HandleDataType) => (
  handle.hideConditions?.some((condition) => {
    const selectedValue = node.data.selectFields?.find((field) => field.technicalID === condition.selectHID)?.selectedValue;
    return selectedValue !== undefined && condition.values.includes(selectedValue);
  }) || false
);

const repeatedHandleTemplateId = (handle: HandleDataType) => (
  typeof handle.repeatIndex === 'number'
    ? handle.hid.replace(new RegExp(`_${handle.repeatIndex}$`), '')
    : undefined
);

const resolveRepeatedRelatedHandleIds = (
  node: Node<ComponentDataType>,
  relatedToHandle: string[] | undefined,
  repeatIndex: number | undefined,
) => {
  if (repeatIndex === undefined) return relatedToHandle;

  return relatedToHandle?.map((relatedHandleId) => {
    const relatedTemplate = node.data.handles?.find((candidate) => (
      candidate.hid === relatedHandleId && candidate.repeated === 'yes'
    ));
    return relatedTemplate ? `${relatedHandleId}_${repeatIndex}` : relatedHandleId;
  });
};

const hydrateRepeatedHandle = (
  node: Node<ComponentDataType>,
  handle: HandleDataType,
) => {
  const templateId = repeatedHandleTemplateId(handle);
  const template = templateId
    ? node.data.handles?.find((candidate) => candidate.hid === templateId && candidate.repeated === 'yes')
    : undefined;

  const hydrated = template ? { ...template, ...handle } : handle;

  return {
    ...hydrated,
    relatedToHandle: resolveRepeatedRelatedHandleIds(node, hydrated.relatedToHandle, handle.repeatIndex),
  };
};

const repeatedVisibleHandles = (node: Node<ComponentDataType>) => (
  (node.data.repeatedHandleArray || []).map((handle) => hydrateRepeatedHandle(node, handle))
);

const allVisibleHandles = (node: Node<ComponentDataType>) => (
  [
    ...(node.data.handles || []),
    ...repeatedVisibleHandles(node),
  ].filter((handle) => !isHiddenByCondition(node, handle))
);

const allHandles = (node: Node<ComponentDataType>) => (
  [
    ...(node.data.handles || []),
    ...repeatedVisibleHandles(node),
  ]
);

const inferRawFunctions = (
  handle: HandleDataType,
): CheckHandleFunction[] => (
  (handle.functions || []) as CheckHandleFunction[]
);

const resistorTerminalIds = new Set(['1', '2']);

const inferFunctions = (
  node: Node<ComponentDataType>,
  handle: HandleDataType,
  rawFunctions: CheckHandleFunction[],
): CheckHandleFunction[] => {
  if (node.data.technicalID === 'Resistor' && resistorTerminalIds.has(handle.hid)) {
    return ['passive'];
  }

  return rawFunctions;
};

const hasVoltageOutputFunction = (functions: CheckHandleFunction[]) => (
  functions.some((fn) => (
    fn === 'suppl_out' ||
    fn === 'dig_out' ||
    fn === 'dig_clock_out' ||
    fn === 'dig_backup_out' ||
    fn === 'pwm_out' ||
    fn === 'usb_power_out'
  ))
);

const inferVoltageOut = (node: Node<ComponentDataType>, handle: HandleDataType, functions: CheckHandleFunction[]) => {
  if (!hasVoltageOutputFunction(functions)) {
    return undefined;
  }
  if (handle.VoutDependency) {
    const inputFieldValue = getInputFieldValue(node, handle.VoutDependency);
    if (typeof inputFieldValue === 'number') {
      return inputFieldValue;
    }
  }
  if (typeof handle.Vout === 'number' && handle.Vout > 0) {
    return handle.Vout;
  }
  const sourceVoltage = getInputFieldValue(node, 'source_voltage');
  if (functions.includes('suppl_out') && typeof sourceVoltage === 'number') {
    return sourceVoltage;
  }
  return undefined;
};

const hasVoltageInputFunction = (functions: CheckHandleFunction[]) => (
  functions.some((fn) => (
    fn === 'suppl_in' ||
    fn === 'dig_in' ||
    fn === 'dig_clock_in' ||
    fn === 'dig_backup_in' ||
    fn === 'pwm_in_R' ||
    fn === 'pwm_in_G' ||
    fn === 'pwm_in_B' ||
    fn === 'pwm_in_W' ||
    fn === 'pwm_in_WW' ||
    fn === 'usb_full'
  ))
);

const inferVoltageRange = (handle: HandleDataType, functions: CheckHandleFunction[]) => {
  if (!hasVoltageInputFunction(functions)) {
    return {};
  }

  if (typeof handle.tolVmin === 'number' || typeof handle.tolVmax === 'number') {
    return {
      voltageMin: handle.tolVmin,
      voltageMax: handle.tolVmax,
    };
  }

  return {};
};

const buildCheckHandle = (
  node: Node<ComponentDataType>,
  handle: HandleDataType,
  edges: Edge<EdgeDataType>[],
): CheckHandle => {
  const rawFunctions = inferRawFunctions(handle);
  const functions = inferFunctions(node, handle, rawFunctions);
  const voltageRange = inferVoltageRange(handle, functions);

  return {
    key: keyOf(node.id, handle.hid),
    node,
    handle,
    rawFunctions,
    functions,
    connectedEdges: edges.filter((edge) => (
      (edge.source === node.id && edge.sourceHandle === handle.hid) ||
      (edge.target === node.id && edge.targetHandle === handle.hid)
    )),
    voltageOut: inferVoltageOut(node, handle, functions),
    ...voltageRange,
  };
};

const uniqueBy = <T,>(items: T[], keyOfItem: (item: T) => string) => (
  Array.from(new Map(items.map((item) => [keyOfItem(item), item])).values())
);

const classificationFunctions = (handle: CheckHandle) => handle.functions;

const hasExclusiveFunction = (handle: CheckHandle, functions: CheckHandleFunction[]) => {
  const handleFunctions = classificationFunctions(handle);
  return handleFunctions.length === 1 && functions.includes(handleFunctions[0]);
};

const classifyNet = (handles: CheckHandle[]): CheckNetClassification[] => {
  const classifications = new Set<CheckNetClassification>();

  if (handles.some((handle) => handle.functions.includes('gnd'))) {
    classifications.add('gnd_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('suppl_out'))) {
    classifications.add('suppl_net_type');
  }
  if (handles.some((handle) => hasExclusiveFunction(handle, ['dig_out', 'dig_clock_out', 'dig_backup_out']))) {
    classifications.add('digital_net_type');
  }
  if (handles.some((handle) => hasExclusiveFunction(handle, ['pwm_out']))) {
    classifications.add('pwm_net_type');
  }
  if (handles.some((handle) => hasExclusiveFunction(handle, ['an_out']))) {
    classifications.add('analog_net_type');
  }
  if (handles.some((handle) => hasExclusiveFunction(handle, ['audio_out']))) {
    classifications.add('audio_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('eth'))) {
    classifications.add('eth_net_type');
  }
  if (handles.some((handle) => hasExclusiveFunction(handle, ['usb_power_out']))) {
    classifications.add('usb_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('rs485_A'))) {
    classifications.add('rs485_a_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('rs485_B'))) {
    classifications.add('rs485_b_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('neutral_out'))) {
    classifications.add('N_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('line_out'))) {
    classifications.add('L_net_type');
  }
  if (handles.some((handle) => classificationFunctions(handle).includes('pe_out'))) {
    classifications.add('PE_net_type');
  }

  return Array.from(classifications);
};

const isSourceHandle = (handle: CheckHandle) => (
  classificationFunctions(handle).some((fn) => (
    fn === 'suppl_out' ||
    fn === 'dig_out' ||
    fn === 'dig_clock_out' ||
    fn === 'dig_backup_out' ||
    fn === 'pwm_out' ||
    fn === 'an_out' ||
    fn === 'audio_out' ||
    fn === 'eth' ||
    fn === 'usb_power_out' ||
    fn === 'rs485_A' ||
    fn === 'rs485_B' ||
    fn === 'neutral_out' ||
    fn === 'line_out' ||
    fn === 'pe_out'
  ))
);

const isSinkHandle = (handle: CheckHandle) => (
  handle.functions.some((fn) => (
    fn === 'suppl_in' ||
    fn === 'dig_in' ||
    fn === 'dig_clock_in' ||
    fn === 'dig_backup_in' ||
    fn === 'pwm_in_R' ||
    fn === 'pwm_in_G' ||
    fn === 'pwm_in_B' ||
    fn === 'pwm_in_W' ||
    fn === 'pwm_in_WW' ||
    fn === 'an_in' ||
    fn === 'audio_in' ||
    fn === 'eth' ||
    fn === 'usb_full' ||
    fn === 'neutral_in' ||
    fn === 'line_in' ||
    fn === 'pe_in'
  ))
);

const createNet = (
  id: string,
  layer: CheckNetLayer,
  handles: CheckHandle[],
  edges: Edge<EdgeDataType>[],
  childNetIds: string[] = [],
): CheckNet => {
  const uniqueHandles = uniqueBy(handles, (handle) => handle.key);
  const uniqueEdges = uniqueBy(edges, (edge) => edge.id);

  return {
    id,
    layer,
    childNetIds: uniqueBy(childNetIds, (childNetId) => childNetId),
    classifications: classifyNet(uniqueHandles),
    handles: uniqueHandles,
    edges: uniqueEdges,
    componentIds: uniqueBy(uniqueHandles.map((handle) => handle.node.id), (nodeId) => nodeId),
    sourceHandles: uniqueHandles.filter(isSourceHandle),
    sinkHandles: uniqueHandles.filter(isSinkHandle),
  };
};

const netByHandleKey = (nets: CheckNet[]) => {
  const byHandleKey = new Map<string, CheckNet>();

  nets.forEach((net) => {
    net.handles.forEach((handle) => {
      byHandleKey.set(handle.key, net);
    });
  });

  return byHandleKey;
};

const createElementaryNets = (handles: CheckHandle[], edges: Edge<EdgeDataType>[]) => {
  const uf = new UnionFind();
  const handleByKey = new Map(handles.map((handle) => [handle.key, handle]));

  handles.forEach((handle) => uf.add(handle.key));

  edges.forEach((edge) => {
    if (!edge.sourceHandle || !edge.targetHandle) return;

    const sourceKey = keyOf(edge.source, edge.sourceHandle);
    const targetKey = keyOf(edge.target, edge.targetHandle);
    if (handleByKey.has(sourceKey) && handleByKey.has(targetKey)) {
      uf.union(sourceKey, targetKey);
    }
  });

  const handlesByNode = new Map<string, CheckHandle[]>();
  handles.forEach((handle) => {
    handlesByNode.set(handle.node.id, [...(handlesByNode.get(handle.node.id) || []), handle]);
  });

  handlesByNode.forEach((nodeHandles) => {
    if (!isPassiveJoinNode(nodeHandles[0].node)) return;

    nodeHandles.forEach((handle, index) => {
      nodeHandles.slice(index + 1).forEach((candidate) => {
        uf.union(handle.key, candidate.key);
      });
    });
  });

  const handlesByRoot = new Map<string, CheckHandle[]>();
  handles.forEach((handle) => {
    const root = uf.find(handle.key);
    handlesByRoot.set(root, [...(handlesByRoot.get(root) || []), handle]);
  });

  const netsByRoot = new Map<string, CheckNet>();
  handlesByRoot.forEach((netHandles, root) => {
    netsByRoot.set(root, createNet(`elementary:${root}`, 'elementary', netHandles, []));
  });

  edges.forEach((edge) => {
    if (!edge.sourceHandle) return;
    const sourceKey = keyOf(edge.source, edge.sourceHandle);
    const root = handleByKey.has(sourceKey) ? uf.find(sourceKey) : undefined;
    const net = root ? netsByRoot.get(root) : undefined;
    if (net) {
      net.edges.push(edge);
    }
  });

  return Array.from(netsByRoot.values())
    .filter((net) => net.edges.length > 0)
    .map((net) => (
      createNet(net.id, net.layer, net.handles, net.edges, net.childNetIds)
    ));
};

const createGroupedNets = (
  childNets: CheckNet[],
  layer: CheckNetLayer,
  connectionPairs: [string, string][],
) => {
  const uf = new UnionFind();
  const childNetById = new Map(childNets.map((net) => [net.id, net]));

  childNets.forEach((net) => uf.add(net.id));
  connectionPairs.forEach(([a, b]) => {
    if (childNetById.has(a) && childNetById.has(b)) {
      uf.union(a, b);
    }
  });

  const childNetsByRoot = new Map<string, CheckNet[]>();
  childNets.forEach((net) => {
    const root = uf.find(net.id);
    childNetsByRoot.set(root, [...(childNetsByRoot.get(root) || []), net]);
  });

  return Array.from(childNetsByRoot.entries()).map(([root, groupedChildNets]) => (
    createNet(
      `${layer}:${root}`,
      layer,
      groupedChildNets.flatMap((net) => net.handles),
      groupedChildNets.flatMap((net) => net.edges),
      groupedChildNets.map((net) => net.id),
    )
  ));
};

const inheritSupplyClassificationFromParentNets = (
  nets: CheckNet[],
  parentNetByHandleKey: Map<string, CheckNet>,
) => (
  nets.map((net) => {
    if (net.classifications.includes('suppl_net_type')) return net;

    const hasSupplyParentNet = net.handles.some((handle) => (
      parentNetByHandleKey.get(handle.key)?.classifications.includes('suppl_net_type')
    ));
    if (!hasSupplyParentNet) return net;

    return {
      ...net,
      classifications: [...net.classifications, 'suppl_net_type' as const],
    };
  })
);

const getFuseConnectionPairs = (
  nodes: Node<ComponentDataType>[],
  handleByKey: Map<string, CheckHandle>,
  childNetByHandleKey: Map<string, CheckNet>,
) => (
  nodes.flatMap((node): [string, string][] => (
    (node.data.internalConnections || [])
      .filter((connection) => connection.kind === 'fuse')
      .flatMap((connection) => {
        const fromHandle = handleByKey.get(keyOf(node.id, connection.fromHandle));
        const toHandle = handleByKey.get(keyOf(node.id, connection.toHandle));
        if (!fromHandle || !toHandle) return [];

        const fromNet = childNetByHandleKey.get(fromHandle.key);
        const toNet = childNetByHandleKey.get(toHandle.key);
        if (!fromNet || !toNet || fromNet.id === toNet.id) return [];

        return [[fromNet.id, toNet.id]];
      })
  ))
);

const fixedVoutMatches = (a: CheckHandle, b: CheckHandle) => (
  typeof a.handle.Vout === 'number' &&
  typeof b.handle.Vout === 'number' &&
  a.handle.Vout > 0 &&
  b.handle.Vout > 0 &&
  Math.abs(a.handle.Vout - b.handle.Vout) < 0.5
);

const sameInputFieldDependency = (a: CheckHandle, b: CheckHandle) => (
  Boolean(
    a.handle.VoutDependency &&
    a.handle.VoutDependency === b.handle.VoutDependency &&
    hasInputField(a.node, a.handle.VoutDependency),
  )
);

const hasFunction = (handle: CheckHandle, fn: CheckHandleFunction) => handle.functions.includes(fn);

const isInternalShort = (a: CheckHandle, b: CheckHandle) => (
  a.node.id === b.node.id &&
  Boolean(a.node.data.internalConnections?.some((connection) => (
    connection.kind === 'short' &&
    (
      (connection.fromHandle === a.handle.hid && connection.toHandle === b.handle.hid) ||
      (connection.fromHandle === b.handle.hid && connection.toHandle === a.handle.hid)
    )
  )))
);

const shouldLinkThroughComponent = (a: CheckHandle, b: CheckHandle) => {
  if (a.node.id !== b.node.id || a.key === b.key) return false;

  if (isInternalShort(a, b)) return true;

  if (hasFunction(a, 'gnd') && hasFunction(b, 'gnd')) return true;

  if (hasFunction(a, 'suppl_out') && hasFunction(b, 'suppl_in')) {
    return a.handle.VoutDependency === b.handle.hid;
  }
  if (hasFunction(b, 'suppl_out') && hasFunction(a, 'suppl_in')) {
    return b.handle.VoutDependency === a.handle.hid;
  }

  if (hasFunction(a, 'suppl_out') && hasFunction(b, 'suppl_out')) {
    return fixedVoutMatches(a, b) || sameInputFieldDependency(a, b);
  }

  if (a.node.data.group === 'led' && hasFunction(a, 'suppl_in') && hasFunction(b, 'suppl_in')) {
    return true;
  }

  return false;
};

const shouldLinkDigitalNetsThroughResistor = (
  a: CheckHandle,
  b: CheckHandle,
  aNet: CheckNet,
  bNet: CheckNet,
) => (
  a.node.id === b.node.id &&
  a.key !== b.key &&
  isPassiveSeriesSignalPair(a, b) &&
  netHasDigitalEndpoint(aNet) &&
  netHasDigitalEndpoint(bNet)
);

const getComponentConnectionPairs = (
  handles: CheckHandle[],
  childNetByHandleKey: Map<string, CheckNet>,
  options: {
    skipFusePassThroughPairs?: boolean;
    skipLedSupplyInputPassThroughPairs?: boolean;
  } = {},
) => {
  const handlesByNode = new Map<string, CheckHandle[]>();
  const pairs: [string, string][] = [];

  handles.forEach((handle) => {
    handlesByNode.set(handle.node.id, [...(handlesByNode.get(handle.node.id) || []), handle]);
  });

  handlesByNode.forEach((nodeHandles) => {
    nodeHandles.forEach((handle, index) => {
      nodeHandles.slice(index + 1).forEach((candidate) => {
        const net = childNetByHandleKey.get(handle.key);
        const candidateNet = childNetByHandleKey.get(candidate.key);
        if (!net || !candidateNet || net.id === candidateNet.id) return;
        if (options.skipFusePassThroughPairs && isFusePassThrough(handle, candidate)) return;
        if (options.skipLedSupplyInputPassThroughPairs && isLedSupplyInputPassThrough(handle, candidate)) return;
        if (
          shouldLinkThroughComponent(handle, candidate) ||
          shouldLinkDigitalNetsThroughResistor(handle, candidate, net, candidateNet)
        ) {
          pairs.push([net.id, candidateNet.id]);
        }
      });
    });
  });

  return pairs;
};

const isFusePassThrough = (a: CheckHandle, b: CheckHandle) => (
  a.node.id === b.node.id &&
  Boolean(a.node.data.internalConnections?.some((connection) => (
    connection.kind === 'fuse' &&
    (
      (connection.fromHandle === a.handle.hid && connection.toHandle === b.handle.hid) ||
      (connection.fromHandle === b.handle.hid && connection.toHandle === a.handle.hid)
    )
  )))
);

const isLedSupplyInputPassThrough = (a: CheckHandle, b: CheckHandle) => {
  if (a.node.id !== b.node.id || a.key === b.key) return false;
  return a.node.data.group === 'led' && isSupplyInputPassThrough(a, b);
};

const isSupplyInputPassThrough = (a: CheckHandle, b: CheckHandle) => {
  if (a.node.id !== b.node.id || a.key === b.key) return false;
  return a.functions.includes('suppl_in') && b.functions.includes('suppl_in');
};

const netHasDigitalEndpoint = (net: CheckNet) => (
  net.classifications.includes('digital_net_type') ||
  net.handles.some((handle) => (
    hasFunction(handle, 'dig_in') ||
    hasFunction(handle, 'dig_clock_in') ||
    hasFunction(handle, 'dig_backup_in') ||
    hasFunction(handle, 'dig_out') ||
    hasFunction(handle, 'dig_clock_out') ||
    hasFunction(handle, 'dig_backup_out')
  ))
);

const isPassiveSeriesSignalPair = (a: CheckHandle, b: CheckHandle) => {
  if (a.node.id !== b.node.id || a.node.data.technicalID !== 'Resistor') return false;
  if (a.key === b.key) return false;

  const nodeHandles = [...(a.node.data.handles || []), ...(a.node.data.repeatedHandleArray || [])];
  return nodeHandles.length === 2 && hasFunction(a, 'passive') && hasFunction(b, 'passive');
};

const isSignalPassThrough = (a: CheckHandle, b: CheckHandle) => isPassiveSeriesSignalPair(a, b);

export function createDiagramCheckContext(
  nodes: Node<ComponentDataType>[],
  edges: Edge<EdgeDataType>[],
): DiagramCheckContext {
  const handles = nodes.flatMap((node) => (
    allVisibleHandles(node).map((handle) => buildCheckHandle(node, handle, edges))
  ));
  const handleByKey = new Map(handles.map((handle) => [handle.key, handle]));
  const wiredHandlesByKey = new Map<string, CheckHandle[]>();
  const elementaryNets = createElementaryNets(handles, edges);
  const elementaryNetByHandleKey = netByHandleKey(elementaryNets);
  const fusedNets = createGroupedNets(
    elementaryNets,
    'fused',
    getFuseConnectionPairs(nodes, handleByKey, elementaryNetByHandleKey),
  );
  const fusedNetByHandleKey = netByHandleKey(fusedNets);
  const componentLinkedNets = createGroupedNets(
    fusedNets,
    'component-linked',
    getComponentConnectionPairs(handles, fusedNetByHandleKey),
  );
  const componentLinkedNetByHandleKey = netByHandleKey(componentLinkedNets);
  const componentLinkedElementaryBasedNets = inheritSupplyClassificationFromParentNets(
    createGroupedNets(
      elementaryNets,
      'component-linked-elementary-based',
      getComponentConnectionPairs(handles, elementaryNetByHandleKey, {
        skipFusePassThroughPairs: true,
        skipLedSupplyInputPassThroughPairs: true,
      }),
    ),
    componentLinkedNetByHandleKey,
  );
  const componentLinkedElementaryBasedNetByHandleKey = netByHandleKey(componentLinkedElementaryBasedNets);
  const nets = componentLinkedNets;
  const netByHandleKeyMap = componentLinkedNetByHandleKey;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const invalidWires: CheckInvalidWire[] = edges.flatMap((edge): CheckInvalidWire[] => {
    const refs: { side: 'source' | 'target'; nodeId: string; handleId?: string | null }[] = [
      { side: 'source', nodeId: edge.source, handleId: edge.sourceHandle },
      { side: 'target', nodeId: edge.target, handleId: edge.targetHandle },
    ];

    return refs.flatMap((ref): CheckInvalidWire[] => {
      const node = nodeById.get(ref.nodeId);
      if (!node) {
        return [{ edge, side: ref.side, handleId: ref.handleId, reason: 'missing-node' }];
      }
      if (!ref.handleId) {
        return [{ edge, side: ref.side, node, handleId: ref.handleId, reason: 'missing-handle' }];
      }

      const visibleHandle = allVisibleHandles(node).some((handle) => handle.hid === ref.handleId);
      if (visibleHandle) return [];

      const knownHiddenHandle = allHandles(node).some((handle) => handle.hid === ref.handleId);
      return [{
        edge,
        side: ref.side,
        node,
        handleId: ref.handleId,
        reason: knownHiddenHandle ? 'hidden-handle' : 'missing-handle',
      }];
    });
  });

  edges.forEach((edge) => {
    if (!edge.sourceHandle || !edge.targetHandle) return;

    const source = handleByKey.get(keyOf(edge.source, edge.sourceHandle));
    const target = handleByKey.get(keyOf(edge.target, edge.targetHandle));
    if (!source || !target) return;

    wiredHandlesByKey.set(source.key, [...(wiredHandlesByKey.get(source.key) || []), target]);
    wiredHandlesByKey.set(target.key, [...(wiredHandlesByKey.get(target.key) || []), source]);
  });

  const resolveVoltageOut = (handle: CheckHandle, visited = new Set<string>()): number | undefined => {
    if (!hasVoltageOutputFunction(handle.functions)) {
      return undefined;
    }

    const dependency = handle.handle.VoutDependency;
    if (dependency) {
      const inputFieldValue = getInputFieldValue(handle.node, dependency);
      if (typeof inputFieldValue === 'number') {
        return inputFieldValue;
      }

      const dependencyHandle = getNodeHandleById(handle.node, dependency);
      if (dependencyHandle) {
        const dependencyCheckHandle = handleByKey.get(keyOf(handle.node.id, dependencyHandle.hid));
        if (dependencyCheckHandle && !visited.has(dependencyCheckHandle.key)) {
          visited.add(dependencyCheckHandle.key);
          const dependencyOutputs = externallyPowerReachableHandles(dependencyCheckHandle)
            .filter((candidate) => hasVoltageOutputFunction(candidate.functions));
          const resolvedVoltage = dependencyOutputs
            .map((candidate) => resolveVoltageOut(candidate, new Set(visited)))
            .find((voltage) => voltage !== undefined);

          if (resolvedVoltage !== undefined) {
            return resolvedVoltage;
          }
        }
      }
    }

    if (typeof handle.handle.Vout === 'number' && handle.handle.Vout > 0) {
      return handle.handle.Vout;
    }

    return handle.voltageOut;
  };

  const reachableHandles = (
    handle: CheckHandle,
    canPassThrough: (current: CheckHandle, candidate: CheckHandle) => boolean,
  ) => {
    const visited = new Set<string>();
    const queue = [handle];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.key)) continue;
      visited.add(current.key);

      const net = elementaryNetByHandleKey.get(current.key);
      net?.handles.forEach((candidate) => {
        if (!visited.has(candidate.key)) queue.push(candidate);
      });

      handles
        .filter((candidate) => canPassThrough(current, candidate))
        .forEach((candidate) => {
          if (!visited.has(candidate.key)) queue.push(candidate);
        });
    }

    return handles.filter((candidate) => visited.has(candidate.key));
  };

  const powerReachableHandles = (handle: CheckHandle) => (
    reachableHandles(handle, (current, candidate) => (
      isInternalShort(current, candidate) ||
      isFusePassThrough(current, candidate) ||
      isSupplyInputPassThrough(current, candidate)
    ))
  );

  const externallyPowerReachableHandles = (handle: CheckHandle) => {
    const externalHandles = handle.connectedEdges.flatMap((edge) => {
      const sourceKey = edge.sourceHandle ? keyOf(edge.source, edge.sourceHandle) : undefined;
      const targetKey = edge.targetHandle ? keyOf(edge.target, edge.targetHandle) : undefined;
      const counterpartKey = sourceKey === handle.key ? targetKey : sourceKey;
      const counterpart = counterpartKey ? handleByKey.get(counterpartKey) : undefined;

      return counterpart && counterpart.node.id !== handle.node.id ? [counterpart] : [];
    });

    const visited = new Set<string>();
    const queue = [...externalHandles];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.key)) continue;
      visited.add(current.key);

      const wiredHandles = wiredHandlesByKey.get(current.key) || [];
      wiredHandles
        .filter((candidate) => candidate.node.id !== handle.node.id)
        .forEach((candidate) => {
          if (!visited.has(candidate.key)) queue.push(candidate);
        });

      handles
        .filter((candidate) => (
          candidate.node.id !== handle.node.id &&
          (
            isInternalShort(current, candidate) ||
            isFusePassThrough(current, candidate) ||
            isSupplyInputPassThrough(current, candidate)
          )
        ))
        .forEach((candidate) => {
          if (!visited.has(candidate.key)) queue.push(candidate);
        });
    }

    return handles.filter((candidate) => visited.has(candidate.key));
  };

  const signalReachableHandles = (handle: CheckHandle) => (
    reachableHandles(handle, (current, candidate) => (
      isInternalShort(current, candidate) ||
      isSignalPassThrough(current, candidate)
    ))
  );

  return {
    nodes,
    edges,
    handles,
    nets,
    elementaryNets,
    fusedNets,
    componentLinkedNets,
    componentLinkedElementaryBasedNets,
    invalidWires,
    getHandle: (nodeId, handleId) => (handleId ? handleByKey.get(keyOf(nodeId, handleId)) : undefined),
    getNetByHandle: (handle) => netByHandleKeyMap.get(handle.key),
    getElementaryNetByHandle: (handle) => elementaryNetByHandleKey.get(handle.key),
    getFusedNetByHandle: (handle) => fusedNetByHandleKey.get(handle.key),
    getComponentLinkedElementaryBasedNetByHandle: (handle) => componentLinkedElementaryBasedNetByHandleKey.get(handle.key),
    hasFunction,
    handlesWithFunction: (fn) => handles.filter((handle) => hasFunction(handle, fn)),
    connectedHandles: (handle) => {
      const net = netByHandleKeyMap.get(handle.key);
      return net ? net.handles.filter((candidate) => candidate.key !== handle.key) : [];
    },
    resolveVoltageOut,
    powerReachableHandles,
    externallyPowerReachableHandles,
    signalReachableHandles,
  };
}

export const describeHandle = (
  handle: CheckHandle,
  options: { includeComponent?: boolean } | number = {},
) => {
  const pinLabel = handle.handle.name || handle.handle.hid;
  if (typeof options === 'object' && options.includeComponent === false) return pinLabel;

  return `${getComponentDisplayName(handle.node.data, handle.node.id)}: ${pinLabel}`;
};

export const voltageMatches = (sourceVoltage: number | undefined, target: CheckHandle) => {
  if (sourceVoltage === undefined) return false;
  const min = target.voltageMin;
  const max = target.voltageMax;
  if (min === undefined && max === undefined) return true;
  return (min === undefined || sourceVoltage >= min) && (max === undefined || sourceVoltage <= max);
};
