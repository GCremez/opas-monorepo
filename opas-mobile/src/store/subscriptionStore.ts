import { create } from 'zustand';
import type { Subscription } from '../types';
import * as api from '../api/subscription';
import * as usageApi from '../api/usage';
import type { UsageResponse } from '../api/usage';
import { useAuthStore } from './authStore';

interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  usage: UsageResponse | null;

  fetchSubscription: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  checkout: (priceId: string) => Promise<string | null>;
  openPortal: () => Promise<string | null>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscription: null,
  loading: false,
  usage: null,

  fetchSubscription: async () => {
    set({ loading: true });
    try {
      const subscription = await api.getSubscription();
      set({ subscription, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchUsage: async () => {
    // Guest/demo mode: show a representative usage meter, skip the authed API.
    if (useAuthStore.getState().isDemo) {
      set({ usage: { remaining: 3, limit: 5, period: 'month' } });
      return;
    }
    try {
      const usage = await usageApi.getUsage();
      set({ usage });
    } catch {
    }
  },

  checkout: async (priceId) => {
    try {
      const { url } = await api.createCheckoutSession(priceId);
      return url;
    } catch {
      return null;
    }
  },

  openPortal: async () => {
    try {
      const { url } = await api.createPortalSession();
      return url;
    } catch {
      return null;
    }
  },
}));
