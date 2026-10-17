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
  // From the document's latest decode; absent/empty until it has been analyzed.
  title?: string | null;
  authority?: string | null;
  deadlines?: { date: string; description: string }[];
  /** The letter's own title in its original language. */
  documentType?: string | null;
  summary?: string | null;
  actions?: string[];
  /** Headline figure for lists, e.g. "€387.20/mo". */
  keyFigure?: string | null;
}

export interface DecodeResult {
  id: string;
  documentId: string;
  // The model's verbatim reply (plain text).
  rawResponse: string | null;
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
  // Built-in category key ("tax", "kela", ...), or null for a folder the user created.
  categoryKey?: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}


