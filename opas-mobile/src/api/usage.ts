import { apiClient } from './client';

export interface UsageResponse {
  remaining: number;
  limit: number;
  period: string;
}

export async function getUsage(): Promise<UsageResponse> {
  const { data } = await apiClient.get('/subscription/usage');
  return data;
}
