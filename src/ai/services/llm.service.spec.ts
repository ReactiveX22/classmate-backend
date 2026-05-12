import { beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyAiProviderError } from '../errors/ai-provider-error.util';
import { AiProviderException } from '../exceptions/ai-provider.exception';
import { LlmService } from './llm.service';

describe('classifyAiProviderError', () => {
  it('classifies rate limit errors as retryable', () => {
    const error = classifyAiProviderError({ status: 429, message: 'Too Many Requests' });

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_RATE_LIMITED',
      retryable: true,
      message: 'The AI provider is rate limited.',
    });
  });

  it('classifies timeouts as retryable', () => {
    const error = classifyAiProviderError({ code: 'ETIMEDOUT', message: 'socket timeout' });

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_TIMEOUT',
      retryable: true,
    });
  });

  it('classifies auth failures as non-retryable', () => {
    const error = classifyAiProviderError({ status: 401, message: 'Unauthorized' });

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_AUTH_FAILED',
      retryable: false,
    });
  });
});

describe('LlmService invokeWithRetry', () => {
  let service: LlmService;

  beforeEach(() => {
    service = new LlmService(
      {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'AI_ENABLED') return false;
          if (key === 'AI_MODEL') return 'gemini-2.5-flash';
          return undefined;
        }),
      } as never,
      {} as never,
      {
        buildSystemPrompt: vi.fn(),
      } as never,
      {
        getTools: vi.fn().mockReturnValue([]),
      } as never,
    );
  });

  it('retries transient failures and eventually succeeds', async () => {
    const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: 'Too Many Requests' })
      .mockResolvedValueOnce('ok');

    await expect((service as any).invokeWithRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
  });

  it('fails fast on non-retryable provider errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' });

    await expect((service as any).invokeWithRetry(fn)).rejects.toThrow(
      AiProviderException,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
