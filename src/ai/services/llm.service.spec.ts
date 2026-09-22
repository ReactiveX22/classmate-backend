import { beforeEach, describe, expect, it, vi, Mocked } from 'vitest';
import { classifyAiProviderError } from '../errors/ai-provider-error.util';
import { MainAgentService } from '../agents/main/main-agent.service';
import { AiProviderService } from './ai-provider.service';
import { LlmService } from './llm.service';

describe('classifyAiProviderError', () => {
  it('classifies rate limit errors as retryable', () => {
    const error = classifyAiProviderError({
      status: 429,
      message: 'Too Many Requests',
    });

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_RATE_LIMITED',
      retryable: true,
      message: 'The AI provider is rate limited. Please try again later.',
    });
  });

  it('classifies timeouts as retryable', () => {
    const error = classifyAiProviderError({
      code: 'ETIMEDOUT',
      message: 'socket timeout',
    });

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_TIMEOUT',
      retryable: true,
    });
  });

  it('classifies auth failures as non-retryable', () => {
    const error = classifyAiProviderError({
      status: 401,
      message: 'Unauthorized',
    });

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_AUTH_FAILED',
      retryable: false,
    });
  });
});

describe('LlmService', () => {
  let service: LlmService;
  let aiProviderService: Mocked<AiProviderService>;

  beforeEach(() => {
    aiProviderService = {
      isEnabled: vi.fn().mockReturnValue(true),
      getModel: vi.fn(),
      invokeWithFailover: vi.fn(),
    } as unknown as Mocked<AiProviderService>;

    const mainAgentService = {
      streamChat: vi.fn(),
    } as unknown as Mocked<MainAgentService>;

    service = new LlmService(mainAgentService, aiProviderService);
  });

  it('returns undefined when AI is disabled', async () => {
    aiProviderService.isEnabled.mockReturnValue(false);

    await expect(service.generateTitle('hi')).resolves.toBeUndefined();
    // eslint-disable-next-line jest/unbound-method -- asserting a mock was not called
    expect(aiProviderService.invokeWithFailover).not.toHaveBeenCalled();
  });

  it('generates a sanitized title through provider failover', async () => {
    const invoke = vi.fn().mockResolvedValue({
      title: '  "Password Reset Help."  ',
    });
    const model = {
      withStructuredOutput: vi.fn().mockReturnValue({ invoke }),
    };
    aiProviderService.invokeWithFailover.mockImplementation(async (fn) => ({
      result: await fn(model as never),
      provider: 'google' as const,
    }));

    await expect(
      service.generateTitle('How do I reset my password?'),
    ).resolves.toBe('Password Reset Help');

    expect(model.withStructuredOutput).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('returns undefined and logs when title generation fails', async () => {
    aiProviderService.invokeWithFailover.mockRejectedValue(
      new Error('rate limited'),
    );
    const warnSpy = vi
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(service.generateTitle('hi')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('rate limited'),
    );
  });

  it('returns undefined when the model returns an empty title', async () => {
    const invoke = vi.fn().mockResolvedValue({ title: '   ' });
    const model = {
      withStructuredOutput: vi.fn().mockReturnValue({ invoke }),
    };
    aiProviderService.invokeWithFailover.mockImplementation(async (fn) => ({
      result: await fn(model as never),
      provider: 'google' as const,
    }));

    await expect(service.generateTitle('hi')).resolves.toBeUndefined();
  });
});
