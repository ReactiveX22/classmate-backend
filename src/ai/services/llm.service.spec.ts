import { ConfigService } from '@nestjs/config';
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

    service = new LlmService(mainAgentService, aiProviderService, {
      get: vi.fn(),
    } as unknown as ConfigService);
  });

  it('throws when AI is disabled', async () => {
    aiProviderService.isEnabled.mockReturnValue(false);

    await expect(service.generateTitle('hi')).resolves.toBeUndefined();
  });
});
