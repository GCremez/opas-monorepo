import { apiClient } from './client';

export interface UsageResponse {
  remaining: number;
  limit: number;
  period: string;
  /** Premium, or drafts are free for everyone during the beta. */
  draftsIncluded?: boolean;
  /** Premium, or deadline reminders are on for everyone during the beta. */
  remindersIncluded?: boolean;
  /** Premium, or case timelines are on for everyone during the beta. */
  casesIncluded?: boolean;
}

export async function getUsage(): Promise<UsageResponse> {
  const { data } = await apiClient.get('/subscription/usage');
  return data;
}
