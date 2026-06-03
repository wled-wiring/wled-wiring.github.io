import type { Edge, Node, ReactFlowInstance } from '@xyflow/react';

import type { DiagramCheckSettings } from '../check/checkSettingsStore';
import { createDiagramExportObject } from './exportModel';
import { isObject, parseImportedFlowObject, type ImportedFlow } from './diagramModel';
import { ENABLE_DIAGRAM_AUTOSAVE } from './autosaveFeatureFlags';

const AUTOSAVE_KEY = 'wled-wiring.diagram.autosave';
const AUTOSAVE_VERSION = 1;

export type DiagramAutosaveSnapshot = {
  version: 1;
  savedAt: string;
  lastManualSaveAt?: string;
  appVersion?: string;
  documentFileName?: string;
  diagram: {
    nodes: Node[];
    edges: Edge[];
    viewport: {
      x: number;
      y: number;
      zoom: number;
    };
    checkSettings: DiagramCheckSettings;
  };
};

const buildSnapshot = (
  diagram: ImportedFlow,
  previous?: DiagramAutosaveSnapshot | null,
  options?: {
    documentFileName?: string;
    lastManualSaveAt?: string;
  },
): DiagramAutosaveSnapshot => ({
  version: AUTOSAVE_VERSION,
  savedAt: new Date().toISOString(),
  lastManualSaveAt: options?.lastManualSaveAt ?? previous?.lastManualSaveAt,
  appVersion: previous?.appVersion,
  documentFileName: options?.documentFileName ?? previous?.documentFileName,
  diagram,
});

export const readAutosave = (): DiagramAutosaveSnapshot | null => {
  if(!ENABLE_DIAGRAM_AUTOSAVE) return null;

  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if(!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if(!isObject(parsed) || parsed.version !== AUTOSAVE_VERSION || !isObject(parsed.diagram)) {
      throw new Error('Invalid autosave snapshot');
    }

    return {
      version: AUTOSAVE_VERSION,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      lastManualSaveAt: typeof parsed.lastManualSaveAt === 'string' ? parsed.lastManualSaveAt : undefined,
      appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : undefined,
      documentFileName: typeof parsed.documentFileName === 'string' ? parsed.documentFileName : undefined,
      diagram: parseImportedFlowObject(parsed.diagram),
    };
  } catch {
    clearAutosave();
    return null;
  }
};

export const writeAutosave = (
  diagram: ImportedFlow,
  options?: {
    documentFileName?: string;
    lastManualSaveAt?: string;
  },
) => {
  if(!ENABLE_DIAGRAM_AUTOSAVE) return;

  const previous = readAutosave();
  const snapshot = buildSnapshot(diagram, previous, options);
  window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
};

export const clearAutosave = () => {
  if(!ENABLE_DIAGRAM_AUTOSAVE) return;

  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Nothing useful to do if local storage is blocked.
  }
};

export const isAutosaveAvailable = () => readAutosave() !== null;

export const writeReactFlowAutosave = (
  reactFlow: ReactFlowInstance,
  options?: {
    documentFileName?: string;
    lastManualSaveAt?: string;
  },
) => {
  if(!ENABLE_DIAGRAM_AUTOSAVE) return;

  writeAutosave(parseImportedFlowObject(createDiagramExportObject(reactFlow)), options);
};

export const markAutosaveManuallySaved = (
  reactFlow: ReactFlowInstance,
  documentFileName?: string,
) => {
  if(!ENABLE_DIAGRAM_AUTOSAVE) return;

  writeReactFlowAutosave(reactFlow, {
    documentFileName,
    lastManualSaveAt: new Date().toISOString(),
  });
};
