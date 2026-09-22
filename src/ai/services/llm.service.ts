import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { MainAgentService } from '../agents/main/main-agent.service';
import { AiProviderService } from './ai-provider.service';

const MAX_TITLE_INPUT_CHARS = 2_000;

@Injectable()
export class LlmService {
  private static readonly titleSchema = z.object({
    title: z.string().min(1).max(80),
  });

  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly mainAgentService: MainAgentService,
    private readonly aiProviderService: AiProviderService,
  ) {}

  streamChat(
    ...args: Parameters<MainAgentService['streamChat']>
  ): ReturnType<MainAgentService['streamChat']> {
    return this.mainAgentService.streamChat(...args);
  }

  async generateTitle(userMessage: string): Promise<string | undefined> {
    if (!this.aiProviderService.isEnabled()) return undefined;

    const trimmedMessage = userMessage.trim().slice(0, MAX_TITLE_INPUT_CHARS);
    if (!trimmedMessage) return undefined;

    try {
      const { result } = await this.aiProviderService.invokeWithFailover(
        async (model) =>
          model
            .withStructuredOutput(LlmService.titleSchema)
            .invoke([
              new SystemMessage(
                [
                  'Generate a concise, sentence-case title (3-7 words) that captures the main topic or goal of this conversation.',
                  'The title should be clear enough that the user recognizes the chat in a list.',
                  'Rules: no quotes, no emojis, no ending punctuation, max 80 characters.',
                  'Good: "Fix login button on mobile"',
                  'Bad (too vague): "Code changes"',
                  'Bad (too long): "Investigate and fix the issue where the login button does not respond"',
                ].join('\n'),
              ),
              new HumanMessage(`User message: ${trimmedMessage}`),
            ]),
      );

      const title = this.sanitizeTitle(result.title);
      if (!title) {
        this.logger.warn('Title generation returned an empty title');
      }
      return title;
    } catch (err) {
      this.logger.warn(
        `Title generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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
