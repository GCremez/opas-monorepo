import { apiClient } from './client';
import type { Document } from '../types';

export async function getDocuments(): Promise<Document[]> {
  const { data } = await apiClient.get('/documents');
  return data;
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get(`/documents/${id}`);
  return data;
}

export async function requestUploadUrl(filename: string, contentType: string): Promise<Document> {
  const { data } = await apiClient.post('/documents/upload-url', { filename, contentType });
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
