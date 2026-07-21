import { apiClient } from './client';
import type { DraftLetter } from '../types';

interface DraftLetterRequest {
  tone: 'formal' | 'professional';
  includeOriginal: boolean;
}

export async function generateDraftLetter(
  documentId: string,
  request: DraftLetterRequest
): Promise<DraftLetter> {
  const { data } = await apiClient.post(`/documents/${documentId}/draft-letter`, request);
  return data;
}

export async function listDraftLetters(documentId: string): Promise<DraftLetter[]> {
  const { data } = await apiClient.get(`/documents/${documentId}/draft-letter`);
  return data;
}
