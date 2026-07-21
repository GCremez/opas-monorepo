import { apiClient } from './client';
import type { Folder } from '../types';

export async function getFolders(): Promise<Folder[]> {
  const { data } = await apiClient.get('/folders');
  return data;
}

export async function getFolder(id: string): Promise<Folder> {
  const { data } = await apiClient.get(`/folders/${id}`);
  return data;
}

export async function createFolder(name: string, description?: string): Promise<Folder> {
  const { data } = await apiClient.post('/folders', { name, description });
  return data;
}

export async function updateFolder(id: string, name: string, description?: string): Promise<Folder> {
  const { data } = await apiClient.put(`/folders/${id}`, { name, description });
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete(`/folders/${id}`);
}
