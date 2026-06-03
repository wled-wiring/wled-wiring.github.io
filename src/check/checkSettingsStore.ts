import { create } from 'zustand';

import {
  DEFAULT_WIRE_AMPACITY_SETTINGS,
  normalizeWireAmpacitySettings,
  type WireAmpacitySettings,
} from '../wires/wireAmpacity';

export type DiagramCheckSettings = {
  wireAmpacity: WireAmpacitySettings;
};

type DiagramCheckSettingsStore = {
  settings: DiagramCheckSettings;
  setWireAmpacitySettings: (settings: WireAmpacitySettings) => void;
  setSettingsFromExport: (settings?: Partial<DiagramCheckSettings> | null) => void;
};

export const DEFAULT_DIAGRAM_CHECK_SETTINGS: DiagramCheckSettings = {
  wireAmpacity: DEFAULT_WIRE_AMPACITY_SETTINGS,
};

export const normalizeDiagramCheckSettings = (
  settings?: Partial<DiagramCheckSettings> | null,
): DiagramCheckSettings => ({
  wireAmpacity: normalizeWireAmpacitySettings(settings?.wireAmpacity),
});

export const useDiagramCheckSettingsStore = create<DiagramCheckSettingsStore>((set) => ({
  settings: DEFAULT_DIAGRAM_CHECK_SETTINGS,
  setWireAmpacitySettings: (wireAmpacity) => set(() => ({
    settings: {
      wireAmpacity: normalizeWireAmpacitySettings(wireAmpacity),
    },
  })),
  setSettingsFromExport: (settings) => set(() => ({
    settings: normalizeDiagramCheckSettings(settings),
  })),
}));
