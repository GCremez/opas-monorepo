import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useDocumentStore } from '../documentStore';
import * as api from '../../api/documents';
import * as decodeApi from '../../api/decode';

jest.mock('../../api/documents');
jest.mock('../../api/decode');
jest.mock('../../lib/analytics', () => ({ track: jest.fn() }));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedDecode = decodeApi as jest.Mocked<typeof decodeApi>;

describe('documentStore.uploadAndDecode', () => {
  const bytes = new Blob(['%PDF-1.7 fake document bytes']);
  const fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    // 1st fetch reads the local file, 2nd is the presigned S3 PUT.
    fetchMock
      .mockResolvedValueOnce({ blob: () => Promise.resolve(bytes) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    mockedApi.requestUploadUrl.mockResolvedValue({ id: 'doc-1', uploadUrl: 'https://s3/put' } as never);
    mockedApi.confirmUpload.mockResolvedValue(undefined);
    mockedApi.getDocuments.mockResolvedValue([]);
    mockedDecode.decodeDocument.mockResolvedValue({ documentId: 'doc-1' } as never);
  });

  it('requests the upload URL with the exact file size and uploads those bytes', async () => {
    const result = await useDocumentStore.getState().uploadAndDecode('scan.jpg', 'image/jpeg', 'file:///scan.jpg');

    // The backend rejects a missing size and signs this exact size into the PUT URL.
    expect(mockedApi.requestUploadUrl).toHaveBeenCalledWith('scan.jpg', 'image/jpeg', bytes.size);
    const [, init] = fetchMock.mock.calls[1] as [string, { method: string; body: Blob; headers: object }];
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    // The body itself must carry the type: React Native sends the Blob's type, not the header.
    expect(init.body.type).toBe('image/jpeg');
    expect(init.body.size).toBe(bytes.size);
    expect(mockedApi.confirmUpload).toHaveBeenCalledWith('doc-1');
    expect(result).toEqual({ documentId: 'doc-1' });
  });

  it('does not confirm an upload that S3 rejected', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({ blob: () => Promise.resolve(bytes) })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    const result = await useDocumentStore.getState().uploadAndDecode('scan.jpg', 'image/jpeg', 'file:///scan.jpg');

    expect(result).toBeNull();
    expect(mockedApi.confirmUpload).not.toHaveBeenCalled();
    expect(useDocumentStore.getState().error).toBe('Failed to upload document');
  });
});
