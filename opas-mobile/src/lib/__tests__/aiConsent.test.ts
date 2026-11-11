import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
}));
const mockPost = jest.fn<(url: string, body: unknown) => Promise<unknown>>();
const mockDelete = jest.fn<(url: string) => Promise<unknown>>();
jest.mock('../../api/client', () => ({
  apiClient: {
    post: (url: string, body: unknown) => mockPost(url, body),
    delete: (url: string) => mockDelete(url),
  },
}));
// eslint-disable-next-line import/first
import { AI_CONSENT_VERSION, grantAiConsent, hasAiConsent, withdrawAiConsent } from '../aiConsent';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockStore.clear();
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: {} });
  mockDelete.mockReset();
  mockDelete.mockResolvedValue({ data: {} });
});

describe('AI consent', () => {
  it('asks a person who never agreed', async () => {
    expect(await hasAiConsent('a@b.fi', null)).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('counts the server record, e.g. on a new device', async () => {
    expect(await hasAiConsent('a@b.fi', AI_CONSENT_VERSION)).toBe(true);
    // and remembers it on this device
    expect(await hasAiConsent('a@b.fi', undefined)).toBe(true);
  });

  it('asks again when the server only has an older version', async () => {
    expect(await hasAiConsent('a@b.fi', 'v1')).toBe(false);
  });

  it('records a yes on the device and the server', async () => {
    await grantAiConsent('a@b.fi');
    expect(mockPost).toHaveBeenCalledWith('/auth/me/ai-consent', { version: AI_CONSENT_VERSION });
    expect(await hasAiConsent('a@b.fi', undefined)).toBe(true);
  });

  it('still lets the person continue when the server is unreachable', async () => {
    mockPost.mockRejectedValue(new Error('offline'));
    await expect(grantAiConsent('a@b.fi')).resolves.toBeUndefined();
    expect(await hasAiConsent('a@b.fi', undefined)).toBe(true);
  });

  it('sends a yes given only on this device once the profile has loaded', async () => {
    await grantAiConsent('a@b.fi');
    mockPost.mockClear();

    await hasAiConsent('a@b.fi', undefined); // profile not loaded yet: no request
    await flush();
    expect(mockPost).not.toHaveBeenCalled();

    await hasAiConsent('a@b.fi', null); // server has no record: send it
    await flush();
    expect(mockPost).toHaveBeenCalledWith('/auth/me/ai-consent', { version: AI_CONSENT_VERSION });
  });

  it('keeps consent per account', async () => {
    await grantAiConsent('a@b.fi');
    expect(await hasAiConsent('other@b.fi', null)).toBe(false);
  });

  it('withdraws on the server and on this device', async () => {
    await grantAiConsent('a@b.fi');
    await withdrawAiConsent('a@b.fi');
    expect(mockDelete).toHaveBeenCalledWith('/auth/me/ai-consent');
    expect(await hasAiConsent('a@b.fi', undefined)).toBe(false);
    // The server no longer has a record, and this device must not re-send the yes.
    expect(await hasAiConsent('a@b.fi', null)).toBe(false);
    await flush();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('keeps consent when the server cannot withdraw it', async () => {
    await grantAiConsent('a@b.fi');
    mockPost.mockClear();
    mockDelete.mockRejectedValue(new Error('offline'));
    await expect(withdrawAiConsent('a@b.fi')).rejects.toThrow('offline');
    expect(await hasAiConsent('a@b.fi', undefined)).toBe(true);
  });
});
