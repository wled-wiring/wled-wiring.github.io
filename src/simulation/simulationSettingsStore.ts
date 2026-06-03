import { create } from "zustand";

type SimulationSettingsState = {
  allowSimulationWithDiagramCheckErrors: boolean;
  setAllowSimulationWithDiagramCheckErrors: (allowSimulationWithDiagramCheckErrors: boolean) => void;
};

export const useSimulationSettingsStore = create<SimulationSettingsState>((set) => ({
  allowSimulationWithDiagramCheckErrors: false,
  setAllowSimulationWithDiagramCheckErrors: (allowSimulationWithDiagramCheckErrors) => set({
    allowSimulationWithDiagramCheckErrors,
  }),
}));
