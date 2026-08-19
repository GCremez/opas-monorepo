export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  plan: SubscriptionTier;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export type SubscriptionTier = 'free' | 'premium';

export type DocumentStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'archived';

export interface Document {
  id: string;
  filename: string;
  contentType: string | null;
  fileSize: number | null;
  status: DocumentStatus;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  uploadUrl: string | null;
  downloadUrl: string | null;
}

export interface DecodeResult {
  id: string;
  documentId: string;
  rawResponse: Record<string, unknown> | null;
  structuredData: Record<string, unknown> | null;
  piiScrubbed: boolean;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export interface DraftLetter {
  id: string;
  documentId: string;
  content: string;
  tone: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}


