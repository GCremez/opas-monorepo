import { create } from 'zustand';
import type { Subscription } from '../types';
import * as api from '../api/subscription';
import * as usageApi from '../api/usage';
import type { UsageResponse } from '../api/usage';
import { track } from '../lib/analytics';

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
    try {
      const usage = await usageApi.getUsage();
      set({ usage });
    } catch {
    }
  },

  checkout: async (priceId) => {
    // checkout_initiated fires here; checkout_completed is authoritative on the
    // backend (Stripe webhook -> opas.subscription.upgraded), since the payment
    // finishes in an external browser the app can't reliably observe.
    track('checkout_initiated', { price_id: priceId });
    try {
      const { url } = await api.createCheckoutSession(priceId);
      return url;
    } catch (err: any) {
      track('checkout_failed', { error: err?.response?.status ?? 'network' });
      return null;
    }
  },

  openPortal: async () => {
    try {
      const { url } = await api.createPortalSession();
      track('portal_opened');
      return url;
    } catch {
      return null;
    }
  },
}));
