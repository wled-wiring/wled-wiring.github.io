import type { Edge, Node } from "@xyflow/react";

import type { ComponentDataType, EdgeDataType } from "../types";

const TRANSIENT_NODE_DATA_KEYS = new Set([
  "checkHighlighted",
  "simulationHighlighted",
  "simulationHighlightedHandleIds",
  "correspondingWireSelected",
]);

const TRANSIENT_EDGE_DATA_KEYS = new Set([
  "checkHighlighted",
  "simulationHighlighted",
  "correspondingInfoNodeSelected",
]);

const stableValue = (value: unknown): unknown => {
  if(Array.isArray(value)) {
    return value.map(stableValue);
  }

  if(value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entryValue]) => [key, stableValue(entryValue)]),
    );
  }

  return value;
};

const stableStringify = (value: unknown) => JSON.stringify(stableValue(value));

const stripTransientDataKeys = <Data extends Record<string, unknown>>(
  data: Data | undefined,
  transientKeys: Set<string>,
) => {
  if(!data) return {};

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !transientKeys.has(key)),
  );
};

const normalizeNode = (node: Node<ComponentDataType>) => ({
  id: node.id,
  type: node.type,
  position: node.position,
  width: node.width,
  height: node.height,
  measured: node.measured,
  data: stripTransientDataKeys(
    node.data as unknown as Record<string, unknown>,
    TRANSIENT_NODE_DATA_KEYS,
  ),
});

const normalizeEdge = (edge: Edge<EdgeDataType>) => ({
  id: edge.id,
  type: edge.type,
  source: edge.source,
  sourceHandle: edge.sourceHandle,
  target: edge.target,
  targetHandle: edge.targetHandle,
  data: stripTransientDataKeys(
    edge.data as unknown as Record<string, unknown> | undefined,
    TRANSIENT_EDGE_DATA_KEYS,
  ),
});

export const createDiagramFingerprint = (
  nodes: Node<ComponentDataType>[],
  edges: Edge<EdgeDataType>[],
) => stableStringify({
  nodes: nodes
    .map(normalizeNode)
    .sort((a, b) => a.id.localeCompare(b.id)),
  edges: edges
    .map(normalizeEdge)
    .sort((a, b) => a.id.localeCompare(b.id)),
});
