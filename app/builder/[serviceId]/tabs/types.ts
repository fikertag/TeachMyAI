export type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color?: string;
  quickPrompts?: Array<{
    title: string;
    prompt: string;
  }>;
  systemPrompt?: string;
  allowedOrigins?: string[];
  hasGeminiApiKey?: boolean;
  geminiApiKeyLast4?: string | null;
  geminiApiKeyUpdatedAt?: string | null;
  promptConfig?: Record<string, unknown>;
};

export type PromptConfigDraft = {
  role: string;
  instruction: string;
  context: string;
  outputConstraints: string;
  styleOrTone: string;
  outputFormat: string;
  examples: string;
  goal: string;
  reasoningStrategy: string;
};

export type KnowledgeDocument = {
  id: string;
  serviceId: string;
  title: string;
  source: string;
  revokedAt?: string;
};

export type ApiKey = {
  id: string;
  name: string;
  apiKey?: string;
  prefix: string;
  last4: string;
  rateLimitPerMinute?: number;
  monthlyRequestLimit?: number;
  lastUsedAt?: string;
  usage?: {
    minute?: { windowStart: string; count: number };
    month?: { windowStart: string; count: number };
  };
  revokedAt?: string;
};
