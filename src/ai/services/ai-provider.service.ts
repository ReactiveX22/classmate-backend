import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogle } from '@langchain/google/node';
import { ChatGroq } from '@langchain/groq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { classifyAiProviderError } from '../errors/ai-provider-error.util';
import { AiProviderException } from '../exceptions/ai-provider.exception';

import { AiProvider } from '../types/ai-provider.types';

export interface ModelOverrides {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  maxRetries?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if AI features are globally enabled
   */
  isEnabled(): boolean {
    return this.configService.get<boolean>('AI_ENABLED') ?? false;
  }

  /**
   * Return a ready-to-use ChatModel instance.
   * Caller handles invoke/stream/bindTools — we just configure.
   */
  getModel(
    provider: AiProvider = this.getDefaultProvider(),
    overrides?: ModelOverrides,
  ): BaseChatModel {
    if (!this.isEnabled()) {
      throw new AiProviderException(
        'AI_PROVIDER_UNAVAILABLE',
        'AI features are currently disabled',
      );
    }

    const apiKey = this.getApiKey(provider);
    if (!apiKey) {
      throw new AiProviderException(
        'AI_PROVIDER_AUTH_FAILED',
        `API key not configured for provider: ${provider}`,
      );
    }

    const defaults = {
      temperature: this.configService.get<number>('AI_TEMPERATURE') ?? 0.2,
      maxOutputTokens:
        this.configService.get<number>('AI_MAX_OUTPUT_TOKENS') ?? 8192,
      maxRetries: 1,
    };

    const options = { ...defaults, ...overrides };

    switch (provider) {
      case 'google':
        return new ChatGoogle({
          model:
            overrides?.model ??
            this.configService.get('GOOGLE_MODEL') ??
            'gemini-2.5-flash',
          apiKey,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          maxRetries: options.maxRetries,
          reasoningEffort: overrides?.reasoningEffort ?? 'low',
        });

      case 'groq':
        return new ChatGroq({
          model:
            overrides?.model ??
            this.configService.get('GROQ_MODEL') ??
            'llama-3.3-70b-versatile',
          apiKey,
          temperature: options.temperature,
          maxTokens: Math.min(options.maxOutputTokens, 2048),
          maxRetries: options.maxRetries,
          reasoningEffort: overrides?.reasoningEffort ?? 'low',
        });

      default:
        throw new AiProviderException(
          'AI_PROVIDER_UNKNOWN',
          `Unsupported provider: ${String(provider)}`,
        );
    }
  }

  /**
   * Simple failover: try preferred, then fallback list.
   * Note: This is for one-shot invokes. For streaming, use getModel and handle errors.
   */
  async invokeWithFailover<T>(
    invokeFn: (model: BaseChatModel) => Promise<T>,
    preferred?: AiProvider,
    fallbacks: AiProvider[] = ['google', 'groq'],
  ): Promise<{ result: T; provider: AiProvider }> {
    const candidates = preferred
      ? [preferred, ...fallbacks.filter((p) => p !== preferred)]
      : fallbacks;

    let lastError: unknown;
    let lastProvider: AiProvider | undefined;

    for (const provider of candidates) {
      // Skip if not configured
      if (!this.isConfigured(provider)) continue;

      lastProvider = provider;

      try {
        const model = this.getModel(provider);
        const result = await invokeFn(model);
        return { result, provider };
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Provider ${provider} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const classified = classifyAiProviderError(lastError);
    throw new AiProviderException(
      classified.code,
      `AI provider failure (${lastProvider}): ${classified.message}`,
      classified.statusCode,
      lastProvider,
    );
  }

  getDefaultProvider(): AiProvider {
    return (
      this.configService.get<AiProvider>('AI_DEFAULT_PROVIDER') ?? 'google'
    );
  }

  isConfigured(provider: AiProvider): boolean {
    return !!this.getApiKey(provider);
  }

  private getApiKey(provider: AiProvider): string | undefined {
    switch (provider) {
      case 'google':
        return this.configService.get<string>('GOOGLE_API_KEY');
      case 'groq':
        return this.configService.get<string>('GROQ_API_KEY');
    }
  }
}
