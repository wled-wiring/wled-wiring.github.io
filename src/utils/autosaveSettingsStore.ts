import { create } from 'zustand';

import { ENABLE_DIAGRAM_AUTOSAVE } from './autosaveFeatureFlags';

const AUTOSAVE_ENABLED_KEY = 'wled-wiring.autosave.enabled';

type AutosaveSettingsStore = {
  autosaveEnabled: boolean;
  setAutosaveEnabled: (autosaveEnabled: boolean) => void;
};

const readInitialAutosaveEnabled = () => {
  if(!ENABLE_DIAGRAM_AUTOSAVE) return false;
  if(typeof window === 'undefined') return true;

  try {
    const stored = window.localStorage.getItem(AUTOSAVE_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

export const useAutosaveSettingsStore = create<AutosaveSettingsStore>((set) => ({
  autosaveEnabled: readInitialAutosaveEnabled(),
  setAutosaveEnabled: (autosaveEnabled) => {
    if(!ENABLE_DIAGRAM_AUTOSAVE) {
      set({autosaveEnabled: false});
      return;
    }

    try {
      window.localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(autosaveEnabled));
    } catch {
      // The setting still works for the current session if storage is blocked.
    }

    set({autosaveEnabled});
  },
}));
