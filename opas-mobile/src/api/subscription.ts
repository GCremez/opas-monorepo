import { apiClient } from './client';
import type { Subscription } from '../types';

export async function getSubscription(): Promise<Subscription> {
  const { data } = await apiClient.get('/subscription');
  return data;
}

/**
 * The Stripe price IDs the backend allows checkout with, in configured order
 * (e.g. monthly then yearly). Fetched at runtime so real, environment-correct IDs
 * are never hardcoded into the app bundle.
 */
export async function getPlans(): Promise<string[]> {
  const { data } = await apiClient.get('/subscription/plans');
  return data;
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  const { data } = await apiClient.post('/subscription/checkout', { priceId });
  return data;
}

export async function createPortalSession(): Promise<{ url: string }> {
  const { data } = await apiClient.post('/subscription/portal');
  return data;
}
