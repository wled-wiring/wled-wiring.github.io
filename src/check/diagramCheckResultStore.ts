import { create } from "zustand";

import type { DiagramCheckIssue } from "./diagramCheckTypes";

export type DiagramCheckResult = {
  fingerprint: string;
  issues: DiagramCheckIssue[];
  checkedAt: number;
};

type DiagramCheckResultState = {
  result: DiagramCheckResult | null;
  clearResult: () => void;
  setResult: (result: DiagramCheckResult | null) => void;
};

export const useDiagramCheckResultStore = create<DiagramCheckResultState>((set) => ({
  result: null,
  clearResult: () => set({result: null}),
  setResult: (result) => set({result}),
}));
