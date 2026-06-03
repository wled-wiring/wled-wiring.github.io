/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Edge, Node } from '@xyflow/react';

export type DiagramSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

type HistoryEntry = {
  snapshot: DiagramSnapshot;
  signature: string;
  label?: string;
};

export type UndoRedoController = {
  canUndo: boolean;
  canRedo: boolean;
  takeSnapshot: (label?: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
};

type UseUndoRedoControllerParams = {
  getSnapshot: () => DiagramSnapshot;
  restoreSnapshot: (snapshot: DiagramSnapshot) => void;
  maxHistory?: number;
};

const UndoRedoContext = createContext<UndoRedoController | undefined>(undefined);

const noopUndoRedoController: UndoRedoController = {
  canUndo: false,
  canRedo: false,
  takeSnapshot: () => undefined,
  undo: () => undefined,
  redo: () => undefined,
  clearHistory: () => undefined,
};

const cloneSnapshot = (snapshot: DiagramSnapshot): DiagramSnapshot => structuredClone(snapshot);

const snapshotSignature = (snapshot: DiagramSnapshot) => JSON.stringify({
  nodes: snapshot.nodes,
  edges: snapshot.edges,
});

const shouldIgnoreShortcut = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
};

export const useUndoRedoController = ({
  getSnapshot,
  restoreSnapshot,
  maxHistory = 100,
}: UseUndoRedoControllerParams): UndoRedoController => {
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const [, setHistoryVersion] = useState(0);

  const refreshHistoryState = useCallback(() => {
    setHistoryVersion((version) => version + 1);
  }, []);

  const takeSnapshot = useCallback((label?: string) => {
    const snapshot = cloneSnapshot(getSnapshot());
    const signature = snapshotSignature(snapshot);
    const lastPastEntry = pastRef.current[pastRef.current.length - 1];

    if (lastPastEntry?.signature === signature) return;

    pastRef.current = [
      ...pastRef.current,
      { snapshot, signature, label },
    ].slice(-maxHistory);
    futureRef.current = [];
    refreshHistoryState();
  }, [getSnapshot, maxHistory, refreshHistoryState]);

  const undo = useCallback(() => {
    const previous = pastRef.current[pastRef.current.length - 1];
    if (!previous) return;

    const current = cloneSnapshot(getSnapshot());
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [
      {
        snapshot: current,
        signature: snapshotSignature(current),
      },
      ...futureRef.current,
    ].slice(0, maxHistory);

    restoreSnapshot(cloneSnapshot(previous.snapshot));
    refreshHistoryState();
  }, [getSnapshot, maxHistory, refreshHistoryState, restoreSnapshot]);

  const redo = useCallback(() => {
    const next = futureRef.current[0];
    if (!next) return;

    const current = cloneSnapshot(getSnapshot());
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [
      ...pastRef.current,
      {
        snapshot: current,
        signature: snapshotSignature(current),
      },
    ].slice(-maxHistory);

    restoreSnapshot(cloneSnapshot(next.snapshot));
    refreshHistoryState();
  }, [getSnapshot, maxHistory, refreshHistoryState, restoreSnapshot]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    refreshHistoryState();
  }, [refreshHistoryState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierPressed = event.ctrlKey || event.metaKey;
      if (!modifierPressed || shouldIgnoreShortcut(event)) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (key === 'z') {
        event.preventDefault();
        undo();
        return;
      }

      if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return useMemo(() => ({
    canUndo,
    canRedo,
    takeSnapshot,
    undo,
    redo,
    clearHistory,
  }), [canRedo, canUndo, clearHistory, redo, takeSnapshot, undo]);
};

export const UndoRedoProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: UndoRedoController;
}) => (
  <UndoRedoContext.Provider value={value}>
    {children}
  </UndoRedoContext.Provider>
);

export const useUndoRedo = () => {
  const value = useContext(UndoRedoContext);
  return value || noopUndoRedoController;
};
