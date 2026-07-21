import { create } from 'zustand';
import type { Document, DecodeResult } from '../types';
import * as api from '../api/documents';
import * as decodeApi from '../api/decode';

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  uploadAndDecode: (
    filename: string,
    contentType: string,
    uri: string
  ) => Promise<DecodeResult | null>;
  deleteDocument: (id: string) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const documents = await api.getDocuments();
      set({ documents, loading: false });
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string }; status?: number } };
      let message = 'Failed to load documents';
      if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.message) {
        message = err.message;
      }
      set({ error: message, loading: false });
    }
  },

  uploadAndDecode: async (filename, contentType, uri) => {
    try {
      const upload = await api.requestUploadUrl(filename, contentType);
      await fetch(upload.uploadUrl!, {
        method: 'PUT',
        body: await fetch(uri).then((r) => r.blob()),
        headers: { 'Content-Type': contentType },
      });
      await api.confirmUpload(upload.id);
      const result = await decodeApi.decodeDocument(upload.id);
      await get().fetchDocuments();
      return result;
    } catch {
      set({ error: 'Failed to upload document' });
      return null;
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.deleteDocument(id);
      set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    } catch {
      set({ error: 'Failed to delete document' });
    }
  },

  archiveDocument: async (id) => {
    try {
      await api.archiveDocument(id);
      set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    } catch {
      set({ error: 'Failed to archive document' });
    }
  },

  clearError: () => set({ error: null }),
}));
