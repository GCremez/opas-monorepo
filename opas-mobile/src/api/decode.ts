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

/** The backend gave up on this decode (OCR, PII scrub or AI step failed). Retryable. */
export class DecodeFailedError extends Error {
  constructor() {
    super('DECODE_FAILED');
    this.name = 'DecodeFailedError';
  }
}

/**
 * Fetch the finished decode result. Resolves to null while the worker is still running
 * (backend answers 404) and throws DecodeFailedError once the decode has failed (422),
 * so callers stop polling instead of waiting for a timeout.
 */
export async function getDecodeResult(documentId: string): Promise<DecodeResult | null> {
  try {
    const { data } = await apiClient.get(`/documents/${documentId}/decode`);
    return data;
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    if (status === 422) throw new DecodeFailedError();
    throw e;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until a decode that is already running finishes (or fails / times out). */
export async function pollDecodeResult(
  documentId: string,
  { intervalMs = 2000, timeoutMs = 180000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<DecodeResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const result = await getDecodeResult(documentId);
    if (result) return result;
  }
  throw new Error('Decode timed out');
}

/**
 * Start a decode and poll until the result is ready. The decode itself runs in the
 * background (OCR + PII scrub + AI), so the first response is only an acknowledgement.
 */
export async function decodeDocument(
  documentId: string,
  scrubPii = true,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<DecodeResult> {
  await startDecode(documentId, scrubPii);
  return pollDecodeResult(documentId, options);
}
