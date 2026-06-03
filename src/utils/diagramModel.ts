import type { Edge, Node } from '@xyflow/react';

import {
  normalizeDiagramCheckSettings,
  type DiagramCheckSettings,
} from '../check/checkSettingsStore';

export type ImportedFlow = {
  nodes: Node[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  checkSettings: DiagramCheckSettings;
};

export const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const readNumber = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const parseImportedFlowObject = (parsed: unknown): ImportedFlow => {
  if (!isObject(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Invalid WLED wiring model file');
  }

  const viewport = isObject(parsed.viewport) ? parsed.viewport : {};

  return {
    nodes: parsed.nodes as Node[],
    edges: parsed.edges as Edge[],
    viewport: {
      x: readNumber(viewport.x, 0),
      y: readNumber(viewport.y, 0),
      zoom: readNumber(viewport.zoom, 1),
    },
    checkSettings: normalizeDiagramCheckSettings(
      isObject(parsed.checkSettings) ? parsed.checkSettings : undefined,
    ),
  };
};

export const parseImportedFlow = (jsonData: string): ImportedFlow => (
  parseImportedFlowObject(JSON.parse(jsonData) as unknown)
);
