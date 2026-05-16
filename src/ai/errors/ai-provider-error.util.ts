import { HttpStatus } from '@nestjs/common';
import { AiProviderError } from './ai-provider-error';

type ErrorLike = {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export function classifyAiProviderError(error: unknown): AiProviderError {
  const err = error as ErrorLike;
  const status = err?.status ?? err?.statusCode;
  const code = err?.code?.toUpperCase();
  const message = err?.message ?? 'Unknown AI provider error';
  const normalizedMessage = message.toLowerCase();

  if (
    status === 429 ||
    code === 'RESOURCE_EXHAUSTED' ||
    normalizedMessage.includes('quota exceeded') ||
    normalizedMessage.includes('rate limit') ||
    normalizedMessage.includes('too many requests')
  ) {
    return {
      code: 'AI_PROVIDER_RATE_LIMITED',
      message: 'The AI provider is rate limited. Please try again later.',
      retryable: true,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      cause: error,
    };
  }

  if (
    normalizedMessage.includes('high demand') ||
    normalizedMessage.includes('overloaded') ||
    normalizedMessage.includes('capacity') ||
    normalizedMessage.includes('spikes in demand')
  ) {
    return {
      code: 'AI_PROVIDER_OVERLOADED',
      message:
        'The AI model is experiencing high demand. Please try again later.',
      retryable: true,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      cause: error,
    };
  }

  if (
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'EAI_AGAIN' ||
    normalizedMessage.includes('timeout') ||
    normalizedMessage.includes('timed out')
  ) {
    return {
      code: 'AI_PROVIDER_TIMEOUT',
      message: 'The AI provider request timed out.',
      retryable: true,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      cause: error,
    };
  }

  if (status && RETRYABLE_STATUSES.has(status)) {
    return {
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: 'The AI provider is temporarily unavailable.',
      retryable: true,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      cause: error,
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    code === 'PERMISSION_DENIED' ||
    normalizedMessage.includes('api key') ||
    normalizedMessage.includes('unauthorized') ||
    normalizedMessage.includes('forbidden')
  ) {
    return {
      code: 'AI_PROVIDER_AUTH_FAILED',
      message: 'The AI provider is not authorized.',
      retryable: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      cause: error,
    };
  }

  if (
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_SOCKET' ||
    code === 'ECONNRESET' ||
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('socket hang up') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('connect econnrefused') ||
    error instanceof TypeError
  ) {
    return {
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: 'The AI provider is temporarily unavailable.',
      retryable: true,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      cause: error,
    };
  }

  if (
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('malformed') ||
    normalizedMessage.includes('unsupported') ||
    normalizedMessage.includes('parse stream') ||
    normalizedMessage.includes('failed to parse stream') ||
    normalizedMessage.includes('invalid response')
  ) {
    return {
      code: 'AI_PROVIDER_INVALID_RESPONSE',
      message: 'The AI provider returned an invalid response.',
      retryable: false,
      statusCode: HttpStatus.BAD_GATEWAY,
      cause: error,
    };
  }

  return {
    code: 'AI_PROVIDER_UNKNOWN',
    message: 'The AI provider returned an unexpected error.',
    retryable: false,
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    cause: error,
  };
}

export function toSafeAiProviderMessage(error: unknown): string {
  return classifyAiProviderError(error).message;
}
