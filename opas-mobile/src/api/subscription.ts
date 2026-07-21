import { apiClient } from './client';
import type { Subscription } from '../types';

export async function getSubscription(): Promise<Subscription> {
  const { data } = await apiClient.get('/subscription');
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
