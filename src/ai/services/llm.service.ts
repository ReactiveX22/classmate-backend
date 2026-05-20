import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogle } from '@langchain/google/node';
import { MainAgentService } from '../agents/main/main-agent.service';
import { AiProviderService } from './ai-provider.service';

@Injectable()
export class LlmService {
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
      });

      const response = await titleModel.invoke([
        new SystemMessage(
          [
            'You will receive a user message from a conversation.',
            'Generate a title (3-6 words, title case) that summarizes the topic.',
            'Rules: No quotes, no ending punctuation, output title only.',
            'Example: Input: "How do I reset my password?" → Output: Password Reset Help',
          ].join('\n'),
        ),
        new HumanMessage(`User message: ${userMessage}`),
      ]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : response.content
              .map((block) =>
                typeof block === 'string'
                  ? block
                  : 'text' in block
                    ? String(block.text)
                    : '',
              )
              .join('');

      return this.sanitizeTitle(content);
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
