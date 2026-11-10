import { apiClient } from './client';

export interface UsageResponse {
  remaining: number;
  limit: number;
  period: string;
  /** Premium, or drafts are free for everyone during the beta. */
  draftsIncluded?: boolean;
}

export async function getUsage(): Promise<UsageResponse> {
  const { data } = await apiClient.get('/subscription/usage');
  return data;
}
