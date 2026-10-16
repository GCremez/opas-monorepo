import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  plan: 'free' | 'premium';
  user: Pick<User, 'name' | 'email'> | null;
  setPlan: (plan: 'free' | 'premium') => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  demoLogin: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  isDemo: false,
  plan: 'free',
  user: null,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      set({ isAuthenticated: true, isLoading: false, isDemo: false });
      get().fetchProfile();
    } else {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: { name: data.name, email: data.email }, plan: data.plan ?? 'free' });
    } catch {}
  },

  setPlan: (plan) => set({ plan }),

  changePassword: async (currentPassword, newPassword) => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  requestPasswordReset: async (email) => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  deleteAccount: async () => {
    await apiClient.delete('/auth/account');
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ isAuthenticated: false, isDemo: false, plan: 'free', user: null });
  },

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('access_token', data.accessToken);
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    set({
      isAuthenticated: true,
      isDemo: false,
      plan: data.plan ?? 'free',
      user: data.user ?? null,
    });
  },

  register: async (name, email, password) => {
    // Registration no longer logs the user in. The backend creates an unverified
    // account and emails a 6-digit code; the caller must route to the verify screen.
    const { data } = await apiClient.post('/auth/register', { name, email, password });
    return { email: data.email ?? email };
  },

  verifyEmail: async (email, code) => {
    const { data } = await apiClient.post('/auth/verify-email', { email, code });
    await SecureStore.setItemAsync('access_token', data.accessToken);
    await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    set({
      isAuthenticated: true,
      isDemo: false,
      plan: data.plan ?? 'free',
      user: data.user ?? null,
    });
  },

  resendVerification: async (email) => {
    await apiClient.post('/auth/resend-verification', { email });
  },

  demoLogin: () => {
    set({
      isAuthenticated: true,
      isDemo: true,
      plan: 'free',
      user: { name: 'Demo User', email: 'demo@opas.app' },
    });
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
      set({ isAuthenticated: false, isDemo: false, plan: 'free', user: null });
    }
  },
}));
