import type { UsageMetadata, ContentBlock } from '@langchain/core/messages';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { ChatGoogle } from '@langchain/google/node';
import { MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import {
  Inject,
  Injectable,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { User } from 'src/auth/auth.factory';
import { AiProviderException } from '../exceptions/ai-provider.exception';
import {
  classifyAiProviderError,
  toSafeAiProviderMessage,
} from '../errors/ai-provider-error.util';
import { AiToolsRegistry } from '../tools/ai-tools-registry.service';
import { LlmStreamEvent } from '../types/ai-stream-event.types';
import { AiContextService } from './ai-context.service';

export type LlmChatResponse = {
  content: string;
  tokenUsage?: UsageMetadata;
  provider: string;
  model: string;
  reasoning?: string;
};

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider = 'google';
  private readonly modelName: string;
  private readonly enabled: boolean;
  private readonly model?: ChatGoogle;
  private readonly checkpointer: PostgresSaver;
  private readonly graph: ReturnType<typeof this.buildChatGraph>;

  constructor(
    private readonly configService: ConfigService,
    @Inject('AI_PG_POOL') private readonly pool: Pool,
    private readonly aiContextService: AiContextService,
    private readonly toolsRegistry: AiToolsRegistry,
  ) {
    this.enabled = this.configService.get<boolean>('AI_ENABLED') ?? false;
    this.modelName =
      this.configService.get<string>('AI_MODEL') ?? 'gemini-2.5-flash';

    if (this.enabled) {
      this.model = new ChatGoogle({
        model: this.modelName,
        apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
        temperature: this.configService.get<number>('AI_TEMPERATURE') ?? 0.2,
        maxOutputTokens:
          this.configService.get<number>('AI_MAX_OUTPUT_TOKENS') ?? 2048,
      });
    }

    this.checkpointer = new PostgresSaver(this.pool);
    this.graph = this.buildChatGraph();
  }

  async onModuleInit() {
    await this.checkpointer.setup();
  }

  /**
   * Send a chat turn through the graph.
   * The graph uses the Postgres checkpointer to automatically resume
   * state across turns using the threadId.
   */
  async chat(
    threadId: string,
    userMessage: string,
    context: { user: User; classroomId?: string },
  ): Promise<LlmChatResponse> {
    if (!this.enabled || !this.model) {
      throw new AiProviderException(
        'AI_PROVIDER_UNAVAILABLE',
        'AI chat is not enabled',
      );
    }

    const result = await this.invokeWithRetry(() =>
      this.graph.invoke(
        { messages: [new HumanMessage(userMessage)] },
        {
          configurable: {
            thread_id: threadId,
            user: context.user,
            classroomId: context.classroomId,
          },
        },
      ),
    );

    const last = result.messages.at(-1) as AIMessage;

    return {
      content: this.extractTextFromBlocks(last.contentBlocks),
      tokenUsage: last.usage_metadata ?? undefined,
      provider: this.provider,
      model: this.modelName,
      reasoning: this.extractReasoningFromBlocks(last.contentBlocks) || undefined,
    };
  }

  async *streamChat(
    threadId: string,
    userMessage: string,
    context: { user: User; classroomId?: string },
  ): AsyncGenerator<LlmStreamEvent> {
    if (!this.enabled || !this.model) {
      throw new AiProviderException(
        'AI_PROVIDER_UNAVAILABLE',
        'AI chat is not enabled',
      );
    }

    try {
      const stream = await this.graph.stream(
        { messages: [new HumanMessage(userMessage)] },
        {
          streamMode: ['messages', 'tools'],
          configurable: {
            thread_id: threadId,
            user: context.user,
            classroomId: context.classroomId,
          },
        },
      );

      for await (const chunk of stream) {
        const [mode, data] = chunk as [
          'messages' | 'tools',
          unknown,
        ];

        if (mode === 'tools') {
          const toolEvent = data as
            | { event?: 'on_tool_start' | 'on_tool_end'; name?: string }
            | undefined;

          if (toolEvent?.name && toolEvent.event === 'on_tool_start') {
            yield {
              type: 'tool',
              payload: { name: toolEvent.name, status: 'start' },
            };
          }

          if (toolEvent?.name && toolEvent.event === 'on_tool_end') {
            yield {
              type: 'tool',
              payload: { name: toolEvent.name, status: 'end' },
            };
          }

          continue;
        }

        const [message, metadata] = data as [
          AIMessage,
          Record<string, unknown> | undefined,
        ];

        if (metadata?.langgraph_node !== 'model') {
          continue;
        }

        const contentBlocks = message.contentBlocks;

        const textDelta = this.extractTextFromBlocks(contentBlocks);
        if (textDelta) {
          yield { type: 'content', payload: { delta: textDelta } };
        }

        const reasoningDelta = this.extractReasoningFromBlocks(contentBlocks);
        if (reasoningDelta) {
          yield { type: 'reasoning', payload: { delta: reasoningDelta } };
        }

        if (message instanceof AIMessage) {
          const reasoning = this.extractReasoningFromBlocks(message.contentBlocks);
          yield {
            type: '_internal_final_llm',
            payload: {
              content: this.extractTextFromBlocks(message.contentBlocks),
              tokenUsage: message.usage_metadata ?? undefined,
              provider: this.provider,
              model: this.modelName,
              reasoning: reasoning || undefined,
            },
          };
        }
      }
    } catch (error) {
      this.logger.debug(`AI stream raw error: ${this.summarizeError(error)}`);
      const classified = classifyAiProviderError(error);
      this.logger.warn(
        `AI stream failed: ${classified.code} retryable=${classified.retryable}`,
      );
      throw new AiProviderException(classified.code, classified.message);
    }
  }

  /**
   * One-shot title generation — not a multi-turn chat flow, so no graph needed.
   * Returns undefined on failure so the caller can fall back gracefully.
   */
  async generateTitle(userMessage: string): Promise<string | undefined> {
    if (!this.enabled || !this.model) return undefined;

    try {
      const response = await this.invokeWithRetry(() =>
        this.model!.invoke([
          new SystemMessage(
            [
              'You will receive a user message from a conversation.',
              'Generate a title (3-6 words, title case) that summarizes the topic.',
              'Rules: No quotes, no ending punctuation, output title only.',
              'Example: Input: "How do I reset my password?" → Output: Password Reset Help',
            ].join('\n'),
          ),
          new HumanMessage(`User message: ${userMessage}`),
        ]),
      );

      return this.sanitizeTitle(this.extractText(response.content));
    } catch {
      return undefined;
    }
  }

  /**
   * Chat graph: START → model → END.
   */
  private buildChatGraph() {
    return new StateGraph(MessagesAnnotation)
      .addNode('model', async (state, config?: RunnableConfig) => {
        if (!this.model) {
          throw new AiProviderException(
            'AI_PROVIDER_UNAVAILABLE',
            'AI chat is not enabled',
          );
        }

        const { user } = (config?.configurable ?? {}) as {
          user: User;
        };
        const systemPrompt = this.aiContextService.buildSystemPrompt(user);

        const tools = this.toolsRegistry.getTools();
        const modelWithTools = this.model.bindTools(tools);

        // System prompt is prepended dynamically each turn. It is never
        // returned in the node output, so it is never saved to the checkpointer state.
        const response = await modelWithTools.invoke([
          systemPrompt,
          ...state.messages,
        ]);

        return { messages: [response] };
      })
      .addNode('tools', new ToolNode(this.toolsRegistry.getTools()))
      .addEdge(START, 'model')
      .addConditionalEdges('model', toolsCondition)
      .addEdge('tools', 'model')
      .compile({ checkpointer: this.checkpointer });
  }

  private extractText(content: AIMessage['content']): string {
    if (typeof content === 'string') return content;
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if ('thought' in block && block.thought === true) return '';
        if ('text' in block) return String(block.text);
        return '';
      })
      .join('');
  }

private extractTextFromBlocks(blocks?: ContentBlock[]): string {
    if (!blocks) return '';
    return blocks
      .map((block) => {
        if (block.type === 'text') {
          return String((block as unknown as { text: string }).text);
        }
        return '';
      })
      .join('');
  }

  private extractReasoningFromBlocks(blocks?: ContentBlock[]): string {
    if (!blocks) return '';
    return blocks
      .map((block) => {
        if (block.type === 'reasoning') {
          return String((block as unknown as { reasoning: string }).reasoning ?? '');
        }
        return '';
      })
      .join('');
  }

  private async invokeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const classified = classifyAiProviderError(error);

        this.logger.warn(
          `AI provider failure on attempt ${attempt}/${maxAttempts}: ${classified.code}`,
        );

        if (!classified.retryable || attempt >= maxAttempts) {
          throw new AiProviderException(
            classified.code,
            toSafeAiProviderMessage(error),
            classified.statusCode,
          );
        }

        await this.sleep(this.backoffMs(attempt));
      }
    }

    const classified = classifyAiProviderError(lastError);
    throw new AiProviderException(
      classified.code,
      classified.message,
      classified.statusCode,
    );
  }

  private backoffMs(attempt: number): number {
    const base = 250 * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * 100);
    return base + jitter;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
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

  private summarizeError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}

// Re-export prebuilt primitives so callers can reference them without a
// separate import if needed during graph expansion.
export { ToolNode, toolsCondition };
