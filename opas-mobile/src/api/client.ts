import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

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

// Refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // A 401 from the auth endpoints themselves means bad credentials / bad
    // refresh token — NOT an expired access token. Don't attempt a refresh
    // there, or a simple wrong-password login gets slow and mislabeled.
    const url: string = original?.url ?? '';
    const isAuthEndpoint = /\/auth\/(login|register|refresh|logout)/.test(url);
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        await SecureStore.setItemAsync('access_token', data.accessToken);
        // The backend ROTATES refresh tokens: each refresh consumes the old one and
        // issues a new one. Persist the new refresh token, otherwise the next refresh
        // replays the now-consumed token, trips the server's theft detection, and the
        // whole session is invalidated (a silent logout after the 2nd refresh).
        if (data.refreshToken) {
          await SecureStore.setItemAsync('refresh_token', data.refreshToken);
        }
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch (err) {
        console.error('Token refresh failed:', err);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);
