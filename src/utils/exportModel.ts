import type { ReactFlowInstance } from '@xyflow/react';

import { useDiagramCheckSettingsStore } from '../check/checkSettingsStore';
import { getCurrentURL } from './utils_functions';

export function createDiagramExportObject(reactFlow: ReactFlowInstance) {
  const checkSettings = useDiagramCheckSettingsStore.getState().settings;

  return {
    ...reactFlow.toObject(),
    application: {
      version: 1,
      name: 'WLED Wiring Model',
      url: getCurrentURL(),
    },
    checkSettings,
  };
}

export function createDiagramExportJson(reactFlow: ReactFlowInstance) {
  return JSON.stringify(createDiagramExportObject(reactFlow));
}
