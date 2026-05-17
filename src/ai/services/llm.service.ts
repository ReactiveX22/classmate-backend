import type { ContentBlock, UsageMetadata } from '@langchain/core/messages';
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
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { User } from 'src/auth/auth.factory';
import { classifyAiProviderError } from '../errors/ai-provider-error.util';
import { AiProviderException } from '../exceptions/ai-provider.exception';
import { AiToolsRegistry } from '../tools/ai-tools-registry.service';
import { AiProvider } from '../types/ai-provider.types';
import { LlmStreamEvent } from '../types/ai-stream-event.types';
import { AiContextService } from './ai-context.service';
import { AiProviderService } from './ai-provider.service';

export type LlmChatResponse = {
  content: string;
  tokenUsage?: UsageMetadata;
  provider: string;
  model: string;
  reasoning?: string;
};

type AIMessageWithBlocks = AIMessage & { contentBlocks?: ContentBlock[] };

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private readonly checkpointer: PostgresSaver;
  private readonly graph: ReturnType<typeof this.buildChatGraph>;

  constructor(
    @Inject('AI_PG_POOL') private readonly pool: Pool,
    private readonly aiContextService: AiContextService,
    private readonly toolsRegistry: AiToolsRegistry,
    private readonly aiProviderService: AiProviderService,
    private readonly configService: ConfigService,
  ) {
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
    if (!this.aiProviderService.isEnabled()) {
      throw new AiProviderException(
        'AI_PROVIDER_UNAVAILABLE',
        'AI chat is not enabled',
      );
    }

    const systemPrompt = this.aiContextService.buildSystemPrompt(context.user);

    const result = await this.graph.invoke(
      { messages: [new HumanMessage(userMessage)] },
      {
        configurable: {
          thread_id: threadId,
          user: context.user,
          systemPrompt,
          classroomId: context.classroomId,
        },
      },
    );

    const last = result.messages.at(-1) as AIMessageWithBlocks;
    const provider =
      (last.response_metadata?.provider as AiProvider) ?? 'unknown';
    const model = (last.response_metadata?.model as string) ?? 'unknown';

    this.logger.log(
      `AI chat completed: threadId=${threadId}, provider=${provider}, model=${model}`,
    );

    return {
      content: this.extractTextFromBlocks(last.contentBlocks),
      tokenUsage: last.usage_metadata ?? undefined,
      provider,
      model,
      reasoning:
        this.extractReasoningFromBlocks(last.contentBlocks) || undefined,
    };
  }

  async *streamChat(
    threadId: string,
    userMessage: string,
    context: { user: User; classroomId?: string },
  ): AsyncGenerator<LlmStreamEvent> {
    if (!this.aiProviderService.isEnabled()) {
      throw new AiProviderException(
        'AI_PROVIDER_UNAVAILABLE',
        'AI chat is not enabled',
      );
    }

    try {
      yield* this.runStream(threadId, userMessage, context);
    } catch (error) {
      const classified = classifyAiProviderError(error);
      const provider =
        error instanceof AiProviderException ? error.provider : undefined;
      const providerSuffix = provider ? ` [${provider}]` : '';

      this.logger.error(
        `AI stream failed: threadId=${threadId}${providerSuffix} - ${classified.message}`,
        error instanceof Error ? error.stack : error,
      );
      throw new AiProviderException(
        classified.code,
        classified.message,
        undefined,
        provider,
      );
    }
  }

  private async *runStream(
    threadId: string,
    userMessage: string,
    context: { user: User; classroomId?: string },
  ): AsyncGenerator<LlmStreamEvent> {
    const systemPrompt = this.aiContextService.buildSystemPrompt(context.user);

    const stream = await this.graph.stream(
      { messages: [new HumanMessage(userMessage)] },
      {
        streamMode: ['messages', 'tools'],
        configurable: {
          thread_id: threadId,
          user: context.user,
          systemPrompt,
          classroomId: context.classroomId,
        },
      },
    );

    for await (const chunk of stream) {
      const [mode, data] = chunk as ['messages' | 'tools', unknown];

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
        AIMessageWithBlocks,
        Record<string, unknown> | undefined,
      ];

      if (metadata?.langgraph_node !== 'model') {
        continue;
      }

      const contentBlocks = message.contentBlocks;

      // DO NOT REMOVE THIS. Debug log for AI streaming
      if (contentBlocks?.length) {
        this.logger.debug(
          `Stream blocks: ${JSON.stringify(contentBlocks, null, 2)}`,
        );
      }

      const textDelta = this.extractTextFromBlocks(contentBlocks);
      if (textDelta) {
        yield { type: 'content', payload: { delta: textDelta } };
      }

      const reasoningDelta = this.extractReasoningFromBlocks(contentBlocks);
      if (reasoningDelta) {
        yield { type: 'reasoning', payload: { delta: reasoningDelta } };
      }

      if (message instanceof AIMessage) {
        const reasoning = this.extractReasoningFromBlocks(
          message.contentBlocks,
        );
        const provider =
          (message.response_metadata?.provider as AiProvider) ?? 'unknown';
        const model = (message.response_metadata?.model as string) ?? 'unknown';

        this.logger.log(
          `AI stream completed: threadId=${threadId}, provider=${provider}, model=${model}`,
        );

        yield {
          type: '_internal_final_llm',
          payload: {
            content: this.extractTextFromBlocks(message.contentBlocks),
            tokenUsage: message.usage_metadata ?? undefined,
            provider,
            model,
            reasoning: reasoning || undefined,
          },
        };
      }
    }
  }

  /**
   * One-shot title generation — not a multi-turn chat flow, so no graph needed.
   * Returns undefined on failure so the caller can fall back gracefully.
   */
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
        const { systemPrompt } = (config?.configurable ?? {}) as {
          systemPrompt: SystemMessage;
        };

        const tools = this.toolsRegistry.getTools();

        // Use invokeWithFailover for robustness within the graph
        const { result, provider } =
          await this.aiProviderService.invokeWithFailover(async (model) => {
            if (!model.bindTools) {
              throw new AiProviderException(
                'AI_PROVIDER_UNAVAILABLE',
                `Model ${model.constructor.name} does not support tool calling`,
              );
            }
            const modelWithTools = model.bindTools(tools);
            return await modelWithTools.invoke([
              systemPrompt,
              ...state.messages,
            ]);
          });

        // Inject provider/model info into response metadata for tracking
        result.response_metadata = {
          ...result.response_metadata,
          provider,
          model: result.response_metadata?.model_name ?? 'unknown',
        };

        return { messages: [result] };
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
          const textBlock = block as unknown as {
            text: string;
            thought?: boolean;
          };
          if (textBlock.thought === true) return '';
          return 'text' in textBlock ? String(textBlock.text) : '';
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
          return 'reasoning' in block
            ? String(
                (block as unknown as { reasoning: string }).reasoning ?? '',
              )
            : '';
        }
        const textBlock = block as unknown as {
          type: string;
          text: string;
          thought?: boolean;
        };
        if (
          textBlock.type === 'text' &&
          textBlock.thought === true &&
          'text' in textBlock
        ) {
          return String(textBlock.text);
        }
        return '';
      })
      .join('');
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

// Re-export prebuilt primitives so callers can reference them without a
// separate import if needed during graph expansion.
export { ToolNode, toolsCondition };
