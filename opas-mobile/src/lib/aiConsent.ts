import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

// App Store guideline 5.1.2(i): people must agree, explicitly and before it happens,
// to their data being sent to a third-party AI. Recorded on the server
// (POST /auth/me/ai-consent, returned by /auth/me) and cached on this device per
// account. Bump the version if what happens to a letter changes, so everyone is asked
// again (v2: Claude moved from Anthropic's API, possibly in the US, to Amazon Bedrock
// in Stockholm; v3: names health information and asks for explicit consent to it,
// GDPR Art. 9(2)(a)).
export const AI_CONSENT_VERSION = 'v3';

const keyFor = (email: string | undefined) =>
  `ai_consent_${AI_CONSENT_VERSION}_${(email ?? 'anon').replace(/[^A-Za-z0-9._-]/g, '_')}`;

async function recordOnServer(): Promise<boolean> {
  try {
    await apiClient.post('/auth/me/ai-consent', { version: AI_CONSENT_VERSION });
    return true;
  } catch {
    return false;
  }
}

/**
 * Has this person agreed to the current consent screen? {@code serverVersion} is the
 * version /auth/me reported: null when they never agreed, undefined while the profile
 * hasn't loaded. Agreeing on another device (or before a reinstall) counts.
 */
export async function hasAiConsent(email: string | undefined, serverVersion?: string | null): Promise<boolean> {
  if (serverVersion === AI_CONSENT_VERSION) {
    try {
      await SecureStore.setItemAsync(keyFor(email), 'granted');
    } catch {
      // The server's record is enough.
    }
    return true;
  }
  let local = false;
  try {
    local = (await SecureStore.getItemAsync(keyFor(email))) === 'granted';
  } catch {
    local = false;
  }
  // Agreed on this device before consent was recorded on the server (or the earlier
  // request failed): send it now, in the background.
  if (local && serverVersion !== undefined) {
    void recordOnServer();
  }
  return local;
}

/** Records the person's yes on this device and on the server. */
export async function grantAiConsent(email: string | undefined): Promise<void> {
  await SecureStore.setItemAsync(keyFor(email), 'granted');
  // Not blocking: if the server can't be reached, the next hasAiConsent call retries.
  await recordOnServer();
}
