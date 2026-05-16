export type AiProviderErrorCode =
  | 'AI_PROVIDER_RATE_LIMITED'
  | 'AI_PROVIDER_OVERLOADED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_AUTH_FAILED'
  | 'AI_PROVIDER_INVALID_RESPONSE'
  | 'AI_PROVIDER_UNKNOWN';

export type AiProviderError = {
  code: AiProviderErrorCode;
  message: string;
  retryable: boolean;
  statusCode: number;
  cause?: unknown;
};
