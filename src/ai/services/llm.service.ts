import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogle } from '@langchain/google/node';
import { z } from 'zod';
import { MainAgentService } from '../agents/main/main-agent.service';
import { AiProviderService } from './ai-provider.service';

@Injectable()
export class LlmService {
  private static readonly titleSchema = z.object({
    title: z.string().min(1).max(80),
  });

  constructor(
    private readonly mainAgentService: MainAgentService,
    private readonly aiProviderService: AiProviderService,
    private readonly configService: ConfigService,
  ) {}

  streamChat(
    ...args: Parameters<MainAgentService['streamChat']>
  ): ReturnType<MainAgentService['streamChat']> {
    return this.mainAgentService.streamChat(...args);
  }

  async generateTitle(userMessage: string): Promise<string | undefined> {
    if (!this.aiProviderService.isEnabled()) return undefined;

    try {
      const titleModel = new ChatGoogle({
        model: 'gemma-4-31b-it',
        apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
        temperature: 0.2,
        maxOutputTokens: 64,
        maxRetries: 0,
      }).withStructuredOutput(LlmService.titleSchema);

      const response = await titleModel.invoke([
        new SystemMessage(
          [
            'You will receive a user message from a conversation.',
            'Generate a concise title (3-6 words, title case) that summarizes the topic.',
            'Rules: No quotes, no ending punctuation, keep it short, output JSON only through the schema.',
            'Example: Input: "How do I reset my password?" → Output: Password Reset Help',
          ].join('\n'),
        ),
        new HumanMessage(`User message: ${userMessage}`),
      ]);

      return this.sanitizeTitle(response.title);
    } catch {
      return undefined;
    }
  }

  private sanitizeTitle(title?: string): string | undefined {
    const sanitized = title
      ?.trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/[.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80);

    return sanitized || undefined;
  }
}
