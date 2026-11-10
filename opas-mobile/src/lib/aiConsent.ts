import * as SecureStore from 'expo-secure-store';

// App Store guideline 5.1.2(i): people must agree, explicitly and before it happens,
// to their data being sent to a third-party AI. Stored per account on this device;
// bump the version if what happens to a letter changes, so everyone is asked again
// (v2: Claude moved from Anthropic's API, possibly in the US, to Amazon Bedrock in Stockholm).
const VERSION = 'v2';

const keyFor = (email: string | undefined) =>
  `ai_consent_${VERSION}_${(email ?? 'anon').replace(/[^A-Za-z0-9._-]/g, '_')}`;

export async function hasAiConsent(email: string | undefined): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(keyFor(email))) === 'granted';
  } catch {
    return false;
  }
}

export async function grantAiConsent(email: string | undefined): Promise<void> {
  await SecureStore.setItemAsync(keyFor(email), 'granted');
}
