import type { ContentBlock } from '@langchain/core/messages';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { Pool } from 'pg';
import { User } from 'src/auth/auth.factory';
import { classifyAiProviderError } from '../../errors/ai-provider-error.util';
import { AiProviderException } from '../../exceptions/ai-provider.exception';
import { MainToolsRegistry } from '../../tools/main-tools-registry.service';
import { AiProvider } from '../../types/ai-provider.types';
import { LlmStreamEvent } from '../../types/ai-stream-event.types';
import { AiContextService } from '../../services/ai-context.service';
import { AiProviderService } from '../../services/ai-provider.service';

type AIMessageWithBlocks = AIMessage & { contentBlocks?: ContentBlock[] };

@Injectable()
export class MainAgentService {
  private readonly logger = new Logger(MainAgentService.name);
  private readonly checkpointer: PostgresSaver;
  private readonly graph: ReturnType<typeof this.buildChatGraph>;

  constructor(
    @Inject('AI_PG_POOL') pool: Pool,
    private readonly aiContextService: AiContextService,
    private readonly toolsRegistry: MainToolsRegistry,
    private readonly aiProviderService: AiProviderService,
  ) {
    this.checkpointer = new PostgresSaver(pool);
    this.graph = this.buildChatGraph();
  }

  async onModuleInit() {
    await this.checkpointer.setup();
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
          | {
              event?: 'on_tool_start' | 'on_tool_end';
              name?: string;
              result?: unknown;
            }
          | undefined;

        if (toolEvent?.name && toolEvent.event === 'on_tool_start') {
          this.logger.log(`[MainAgent] Tool start: ${toolEvent.name}`);
          yield {
            type: 'tool',
            payload: { name: toolEvent.name, status: 'start' },
          };
        }

        if (toolEvent?.name && toolEvent.event === 'on_tool_end') {
          const resultStr =
            toolEvent.result !== undefined
              ? JSON.stringify(toolEvent.result).substring(0, 200)
              : 'undefined';
          this.logger.log(
            `[MainAgent] Tool end: ${toolEvent.name}, result: ${resultStr}`,
          );
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
      const textDelta = this.extractTextFromBlocks(contentBlocks);
      if (textDelta) yield { type: 'content', payload: { delta: textDelta } };

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

  private buildChatGraph() {
    return new StateGraph(MessagesAnnotation)
      .addNode('model', async (state, config?: RunnableConfig) => {
        const { systemPrompt } = (config?.configurable ?? {}) as {
          systemPrompt: SystemMessage;
        };

        const tools = this.toolsRegistry.getTools();

        this.logger.log(
          `[MainAgent] Model node called. Messages in state: ${state.messages.length}`,
        );
        const lastMsg = state.messages.at(-1);
        this.logger.log(
          `[MainAgent] Last message type: ${lastMsg?.constructor.name}, content: ${JSON.stringify(lastMsg?.content).substring(0, 300)}`,
        );

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
}
