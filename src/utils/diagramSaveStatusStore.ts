import { create } from 'zustand';

type DiagramSaveStatusStore = {
  hasUnsavedChanges: boolean;
  markUnsaved: () => void;
  markSaved: () => void;
};

export const useDiagramSaveStatusStore = create<DiagramSaveStatusStore>((set) => ({
  hasUnsavedChanges: false,
  markUnsaved: () => set({hasUnsavedChanges: true}),
  markSaved: () => set({hasUnsavedChanges: false}),
}));
