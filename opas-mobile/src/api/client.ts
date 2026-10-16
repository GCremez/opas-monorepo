import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { track } from '../lib/analytics';

const extra = Constants.expoConfig?.extra;
const BASE_URL = extra?.apiBaseUrl ?? 'http://localhost:8080/api/v1';

if (__DEV__ && !extra?.apiBaseUrl) {
  console.warn('[api] No apiBaseUrl configured in app.json extra — using localhost fallback');
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional hook the auth store registers so the interceptor can drive the app
// back to a logged-out state when a refresh definitively fails. Keeps this
// module free of a circular import on the store.
let onAuthCleared: (() => void) | null = null;
export function setOnAuthCleared(cb: (() => void) | null) {
  onAuthCleared = cb;
}

// A single in-flight refresh shared by every request that 401s at once. Without
// this, N concurrent expired requests would each fire their own /auth/refresh;
// because the backend rotates refresh tokens, only the first would succeed and
// the rest would replay a consumed token and nuke the whole session.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  // Send the current access token so the backend can blacklist it on rotation.
  const accessToken = await SecureStore.getItemAsync('access_token');
  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  );
  await SecureStore.setItemAsync('access_token', data.accessToken);
  // The backend ROTATES refresh tokens: each refresh consumes the old one and
  // issues a new one. Persist the new refresh token, otherwise the next refresh
  // replays the now-consumed token, trips the server's theft detection, and the
  // whole session is invalidated (a silent logout after the 2nd refresh).
  if (data.refreshToken) {
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
  }
  return data.accessToken as string;
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync('access_token'),
    SecureStore.deleteItemAsync('refresh_token'),
  ]);
  onAuthCleared?.();
}

// Refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // A 401 from the auth endpoints themselves means bad credentials / bad
    // refresh token — NOT an expired access token. Don't attempt a refresh
    // there, or a simple wrong-password login gets slow and mislabeled.
    const url: string = original?.url ?? '';
    const isAuthEndpoint =
      /\/auth\/(login|register|refresh|logout|verify-email|resend-verification|forgot-password|reset-password)/.test(url);
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        // Coalesce concurrent 401s onto one refresh. The first caller creates
        // the promise; everyone else awaits the same one and then retries.
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      } catch (err) {
        console.error('Token refresh failed:', err);
        track('session_expired');
        await clearTokens();
      }
    }
    // Surface non-401 API failures (5xx, 4xx other than auth) for the beta. Strip
    // the query string so no ids/params leak into analytics; path only.
    const status = error.response?.status;
    if (status && status !== 401) {
      track('api_error', {
        status,
        url: (original?.url ?? '').split('?')[0],
        method: (original?.method ?? '').toUpperCase(),
      });
    }
    return Promise.reject(error);
  }
);
