import { create } from 'zustand';
import type { Folder } from '../types';
import * as api from '../api/folders';

interface FolderState {
  folders: Folder[];
  loading: boolean;
  error: string | null;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, description?: string) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  loading: false,
  error: null,

  fetchFolders: async () => {
    set({ loading: true, error: null });
    try {
      const folders = await api.getFolders();
      set({ folders, loading: false });
    } catch {
      set({ error: 'Failed to load folders', loading: false });
    }
  },

  createFolder: async (name, description) => {
    try {
      const folder = await api.createFolder(name, description);
      set((s) => ({ folders: [folder, ...s.folders] }));
      return folder;
    } catch {
      set({ error: 'Failed to create folder' });
      throw new Error('Failed to create folder');
    }
  },

  deleteFolder: async (id) => {
    try {
      await api.deleteFolder(id);
      set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
    } catch {
      set({ error: 'Failed to delete folder' });
    }
  },

  clearError: () => set({ error: null }),
}));
