import { apiClient } from './client';
import type { DecodeResult } from '../types';

/**
 * Kick off a decode. This is asynchronous on the backend: it returns a "queued"
 * acknowledgement, not the finished result. Poll getDecodeResult (or pollDecodeResult)
 * for the actual output.
 */
export async function startDecode(
  documentId: string,
  scrubPii = true
): Promise<{ documentId: string; status: string }> {
  const { data } = await apiClient.post(`/documents/${documentId}/decode`, { scrubPii });
  return data;
}

/**
 * Fetch the finished decode result. Resolves to null while the worker is still
 * running (backend answers 404); resolves to the result once it is ready.
 */
export async function getDecodeResult(documentId: string): Promise<DecodeResult | null> {
  try {
    const { data } = await apiClient.get(`/documents/${documentId}/decode`);
    return data;
  } catch (e: unknown) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    throw e;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Start a decode and poll until the result is ready. The decode itself runs in the
 * background (OCR + PII scrub + AI), so the first response is only an acknowledgement.
 */
export async function decodeDocument(
  documentId: string,
  scrubPii = true,
  { intervalMs = 2000, timeoutMs = 120000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<DecodeResult> {
  await startDecode(documentId, scrubPii);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const result = await getDecodeResult(documentId);
    if (result) return result;
  }
  throw new Error('Decode timed out');
}
