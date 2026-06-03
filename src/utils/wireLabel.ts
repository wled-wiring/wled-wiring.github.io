import type { Edge, Node } from '@xyflow/react';

import type { ComponentDataType, EdgeDataType } from '../types';
import { getComponentDisplayName } from './componentDisplayName';

const allNodeHandles = (node: Node<ComponentDataType>) => [
  ...(node.data.handles || []),
  ...(node.data.repeatedHandleArray || []),
];

export const readableWireEndpointLabel = (
  node: Node<ComponentDataType> | undefined,
  nodeId: string,
  handleId: string | null | undefined,
) => {
  const component = node ? getComponentDisplayName(node.data, node.id) : nodeId;
  if (node?.data.technicalID === 'SolderJoint') return component;

  const handle = node && handleId
    ? allNodeHandles(node).find((candidate) => candidate.hid === handleId)
    : undefined;
  const pin = handle?.name || handleId || nodeId;

  return `${component}: ${pin}`;
};

export const readableWireLabel = (
  edge: Pick<Edge<EdgeDataType>, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
  nodes: Iterable<Node<ComponentDataType>> = [],
) => {
  const nodeById = new Map(Array.from(nodes, (node) => [node.id, node]));

  return [
    readableWireEndpointLabel(nodeById.get(edge.source), edge.source, edge.sourceHandle),
    readableWireEndpointLabel(nodeById.get(edge.target), edge.target, edge.targetHandle),
  ].join(' -> ');
};
