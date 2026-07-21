import { apiClient } from './client';
import type { DecodeResult } from '../types';

export async function decodeDocument(
  documentId: string,
  scrubPii = true
): Promise<DecodeResult> {
  const { data } = await apiClient.post(`/documents/${documentId}/decode`, { scrubPii });
  return data;
}
