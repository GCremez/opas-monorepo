import { create } from 'zustand';
import type { Document, DecodeResult } from '../types';
import * as api from '../api/documents';
import * as decodeApi from '../api/decode';
import { useAuthStore } from './authStore';

// Sample record shown in guest/demo mode so the main screens present a
// populated "Personal Record" instead of hitting the authenticated API.
// Ids match the demo references in search / docs / alerts / document detail.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const DEMO_DOCUMENTS: Document[] = [
  { id: 'sample-1', filename: 'KELA — Housing Benefit', contentType: 'application/pdf', fileSize: 284_000, status: 'ready', folderId: null, createdAt: hoursAgo(2), updatedAt: hoursAgo(2), uploadUrl: null, downloadUrl: null },
  { id: 'sample-2', filename: 'Tax Card 2025', contentType: 'application/pdf', fileSize: 112_000, status: 'ready', folderId: null, createdAt: hoursAgo(26), updatedAt: hoursAgo(26), uploadUrl: null, downloadUrl: null },
  { id: 'sample-3', filename: 'Residence Permit Extension', contentType: 'application/pdf', fileSize: 498_000, status: 'uploaded', folderId: null, createdAt: hoursAgo(74), updatedAt: hoursAgo(74), uploadUrl: null, downloadUrl: null },
];

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
    // Guest/demo mode: serve the sample record, never call the authed API.
    if (useAuthStore.getState().isDemo) {
      set({ documents: DEMO_DOCUMENTS, loading: false, error: null });
      return;
    }
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
      const putRes = await fetch(upload.uploadUrl!, {
        method: 'PUT',
        body: await fetch(uri).then((r) => r.blob()),
        headers: { 'Content-Type': contentType },
      });
      // fetch only rejects on network failure, not on a 4xx/5xx from S3. Check the
      // status so a rejected upload doesn't get confirmed as a phantom document that
      // the decode step then fails on (missing object).
      if (!putRes.ok) {
        throw new Error(`Upload failed with status ${putRes.status}`);
      }
      await api.confirmUpload(upload.id);
      const result = await decodeApi.decodeDocument(upload.id);
      await get().fetchDocuments();
      return result;
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      // 402 = monthly decode limit reached; distinct message so the UI can route to
      // the upgrade screen instead of showing a generic failure.
      set({ error: status === 402 ? 'DECODE_LIMIT_REACHED' : 'Failed to upload document' });
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
