import { create } from "zustand";

import type { SimulationResult } from "./simulationTypes";

export type SimulationDisplayMode = "default" | "extended";

type SimulationWireHover = {
  edgeId: string;
  x: number;
  y: number;
} | null;

type SimulationResultState = {
  displayMode: SimulationDisplayMode;
  result: SimulationResult | null;
  wireHover: SimulationWireHover;
  setDisplayMode: (displayMode: SimulationDisplayMode) => void;
  setResult: (result: SimulationResult | null) => void;
  setWireHover: (wireHover: SimulationWireHover) => void;
};

export const useSimulationResultStore = create<SimulationResultState>((set) => ({
  displayMode: "default",
  result: null,
  wireHover: null,
  setDisplayMode: (displayMode) => set({displayMode}),
  setResult: (result) => set({result, wireHover: null}),
  setWireHover: (wireHover) => set({wireHover}),
}));
