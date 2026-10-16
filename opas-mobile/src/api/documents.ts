import { apiClient } from './client';
import type { Document } from '../types';

export async function getDocuments(): Promise<Document[]> {
  const { data } = await apiClient.get('/documents');
  return data;
}

export interface DocumentSearchResult {
  id: string;
  filename: string | null;
  similarity: number;
}

// Semantic search over the user's decoded documents (backed by embeddings).
export async function searchDocuments(query: string, limit = 20): Promise<DocumentSearchResult[]> {
  const { data } = await apiClient.get('/documents/search', { params: { q: query, limit } });
  return data;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get(`/documents/${id}`);
  return data;
}

// fileSize must be the exact byte count: the backend signs it into the presigned PUT,
// so S3 rejects an upload whose Content-Length differs.
export async function requestUploadUrl(
  filename: string,
  contentType: string,
  fileSize: number
): Promise<Document> {
  const { data } = await apiClient.post('/documents/upload-url', { filename, contentType, fileSize });
  return data;
}

export async function confirmUpload(id: string): Promise<void> {
  await apiClient.patch(`/documents/${id}/confirm`);
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function archiveDocument(id: string): Promise<void> {
  await apiClient.patch(`/documents/${id}/archive`);
}

// File a document under a folder, or pass null to remove it from its folder.
export async function assignFolder(id: string, folderId: string | null): Promise<Document> {
  const { data } = await apiClient.patch(`/documents/${id}/folder`, { folderId });
  return data;
}
