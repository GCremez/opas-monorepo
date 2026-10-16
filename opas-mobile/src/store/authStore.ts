import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient, setOnAuthCleared } from '../api/client';
import { identify, track, reset as resetAnalytics } from '../lib/analytics';
import type { User } from '../types';

// Tie PostHog events to a stable, non-PII id (the account UUID) and set person
// properties. Never pass name/email as the distinct id or as properties.
function identifyUser(id: string | undefined, plan: 'free' | 'premium'): void {
  if (!id) return;
  identify(id, { plan, is_demo: false });
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  plan: 'free' | 'premium';
  user: Pick<User, 'name' | 'email'> | null;
  setPlan: (plan: 'free' | 'premium') => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  plan: 'free',
  user: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      set({ isAuthenticated: true, isLoading: false });
      get().fetchProfile();
    } else {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: { name: data.name, email: data.email }, plan: data.plan ?? 'free' });
      // Re-identify on every profile load so a session restored at app launch
      // (hydrate -> fetchProfile) is attributed to the right person.
      identifyUser(data.id, data.plan ?? 'free');
    } catch (err: any) {
      // A surviving 401 means the interceptor already tried (and failed) to
      // refresh — the session is dead, so drop authenticated state instead of
      // leaving the UI "logged in" with a null user. Other errors (offline,
      // 5xx) are transient: keep the session and just log.
      if (err?.response?.status === 401) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        set({ isAuthenticated: false, plan: 'free', user: null });
      } else {
        console.error('fetchProfile failed:', err?.message);
      }
    }
  },

  setPlan: (plan) => set({ plan }),

  changePassword: async (currentPassword, newPassword) => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  requestPasswordReset: async (email) => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  confirmPasswordReset: async (email, code, newPassword) => {
    // Backend consumes the one-time code, sets the new password, and invalidates all
    // existing sessions. It does NOT log the user in — they return to sign-in and log
    // in with the new password. A bad/expired code surfaces as a 400.
    await apiClient.post('/auth/reset-password', { email, code, newPassword });
  },

  deleteAccount: async () => {
    await apiClient.delete('/auth/account');
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    // The account no longer exists, so this device is no longer "returning" —
    // clear the flag or the login screen keeps greeting a deleted user with
    // "Welcome back". (Logout intentionally leaves it: that user is returning.)
    await SecureStore.deleteItemAsync('has_registered');
    set({ isAuthenticated: false, plan: 'free', user: null });
    resetAnalytics();
  },

  login: async (email, password) => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      set({
        isAuthenticated: true,
        plan: data.plan ?? 'free',
        user: data.user ?? null,
      });
      identifyUser(data.user?.id, data.plan ?? 'free');
      track('auth_login_completed', { plan: data.plan ?? 'free', method: 'email' });
    } catch (err: any) {
      // Don't record the raw message (may echo user input); a coarse label is enough.
      track('auth_login_failed', { error: err?.response?.status ?? 'network' });
      throw err;
    }
  },

  register: async (name, email, password) => {
    // Registration no longer logs the user in. The backend creates an unverified
    // account and emails a 6-digit code; the caller must route to the verify screen.
    track('auth_register_started');
    const { data } = await apiClient.post('/auth/register', { name, email, password });
    track('auth_register_completed', { method: 'email' });
    return { email: data.email ?? email };
  },

  verifyEmail: async (email, code) => {
    const { data } = await apiClient.post('/auth/verify-email', { email, code });
    await SecureStore.setItemAsync('access_token', data.accessToken);
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    set({
      isAuthenticated: true,
      plan: data.plan ?? 'free',
      user: data.user ?? null,
    });
    identifyUser(data.user?.id, data.plan ?? 'free');
    track('auth_verify_completed');
  },

  resendVerification: async (email) => {
    await apiClient.post('/auth/resend-verification', { email });
  },

  logout: async () => {
    try {
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (refresh) {
        await apiClient.post('/auth/logout', { refreshToken: refresh });
      }
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ isAuthenticated: false, plan: 'free', user: null });
      track('auth_logout');
      // Sever the PostHog identity so the next (possibly different) user on this
      // device isn't merged into the previous person.
      resetAnalytics();
    }
  },
}));

// Let the axios interceptor flip the store to logged-out when a token refresh
// fails outside of an explicit user action (e.g. a background request 401s).
setOnAuthCleared(() => {
  useAuthStore.setState({ isAuthenticated: false, plan: 'free', user: null });
});
