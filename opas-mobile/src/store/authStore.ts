import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

interface AuthState {
  isAuthenticated: boolean;
  plan: 'free' | 'premium';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  plan: 'free',

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      set({ isAuthenticated: true });
    }
  },

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('access_token', data.access_token);
    await SecureStore.setItemAsync('refresh_token', data.refresh_token);
    set({ isAuthenticated: true, plan: data.plan ?? 'free' });
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ isAuthenticated: false, plan: 'free' });
    }
  },
}));
