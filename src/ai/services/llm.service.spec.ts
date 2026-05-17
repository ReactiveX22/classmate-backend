import { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi, Mocked } from 'vitest';
import { classifyAiProviderError } from '../errors/ai-provider-error.util';
import { AiProviderException } from '../exceptions/ai-provider.exception';
import { AiToolsRegistry } from '../tools/ai-tools-registry.service';
import { AiContextService } from './ai-context.service';
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
  let toolsRegistry: Mocked<AiToolsRegistry>;

  beforeEach(() => {
    aiProviderService = {
      isEnabled: vi.fn().mockReturnValue(true),
      getModel: vi.fn(),
      invokeWithFailover: vi.fn(),
    } as unknown as Mocked<AiProviderService>;

    toolsRegistry = {
      getTools: vi.fn().mockReturnValue([]),
    } as unknown as Mocked<AiToolsRegistry>;

    service = new LlmService(
      {} as Pool,
      {
        buildSystemPrompt: vi.fn(),
      } as unknown as AiContextService,
      toolsRegistry,
      aiProviderService,
    );
  });

  it('throws when AI is disabled', async () => {
    aiProviderService.isEnabled.mockReturnValue(false);

    await expect(
      service.chat('thread-1', 'hi', { user: { id: '1' } as any }),
    ).rejects.toThrow(AiProviderException);
  });
});
