import { create } from 'zustand';
import type { Document, DecodeResult } from '../types';
import * as api from '../api/documents';
import * as decodeApi from '../api/decode';
import { track } from '../lib/analytics';

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  /** Set with DECODE_FAILED: the document was saved, only reading it failed. */
  failedDocumentId: string | null;

  fetchDocuments: () => Promise<void>;
  uploadAndDecode: (
    filename: string,
    contentType: string,
    uri: string
  ) => Promise<DecodeResult | null>;
  deleteDocument: (id: string) => Promise<void>;
  /** File a document into a folder, or pass null to take it out of every folder. */
  assignFolder: (id: string, folderId: string | null) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  failedDocumentId: null,

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
    let stage: 'upload' | 'decode' = 'upload';
    let documentId: string | null = null;
    try {
      // Read the file first: the upload URL is issued for its exact size.
      const file = await fetch(uri).then((r) => r.blob());
      // React Native sends a Blob body with the Blob's own type and ignores the
      // Content-Type header. A photo read from disk has no type, so S3 stored uploads as
      // binary/octet-stream and the backend rejected them at confirm. Re-wrap the bytes
      // with the declared type so the PUT carries it.
      const blob = file.type === contentType ? file : new Blob([file], { type: contentType });
      const upload = await api.requestUploadUrl(filename, contentType, blob.size);
      const putRes = await fetch(upload.uploadUrl!, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });
      // fetch only rejects on network failure, not on a 4xx/5xx from S3. Check the
      // status so a rejected upload doesn't get confirmed as a phantom document that
      // the decode step then fails on (missing object).
      if (!putRes.ok) {
        throw new Error(`Upload failed with status ${putRes.status}`);
      }
      await api.confirmUpload(upload.id);
      stage = 'decode';
      documentId = upload.id;
      const result = await decodeApi.decodeDocument(upload.id);
      await get().fetchDocuments();
      return result;
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      // 402 = monthly decode limit reached; distinct message so the UI can route to
      // the upgrade screen instead of showing a generic failure.
      if (status === 402) {
        track('decode_limit_hit', { remaining: 0 });
      }
      // The document exists once confirmed; refresh first, since fetching clears `error`.
      if (stage === 'decode') await get().fetchDocuments();
      // Error codes, not messages: the scan screen words them per stage, so a letter
      // that uploaded fine but couldn't be read isn't reported as an upload failure.
      set({
        error: status === 402 ? 'DECODE_LIMIT_REACHED' : stage === 'upload' ? 'UPLOAD_FAILED' : 'DECODE_FAILED',
        failedDocumentId: stage === 'decode' && status !== 402 ? documentId : null,
      });
      return null;
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.deleteDocument(id);
      set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
      track('document_deleted', { doc_id: id });
    } catch {
      set({ error: 'Failed to delete document' });
    }
  },

  assignFolder: async (id, folderId) => {
    const updated = await api.assignFolder(id, folderId);
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...updated } : d)) }));
    track('document_filed', { doc_id: id, has_folder: folderId !== null });
  },

  archiveDocument: async (id) => {
    try {
      await api.archiveDocument(id);
      set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
      track('document_archived', { doc_id: id });
    } catch {
      set({ error: 'Failed to archive document' });
    }
  },

  clearError: () => set({ error: null, failedDocumentId: null }),
}));
