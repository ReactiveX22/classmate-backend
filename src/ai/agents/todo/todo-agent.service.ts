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
import { AiProviderException } from '../../exceptions/ai-provider.exception';
import { AiProviderService } from '../../services/ai-provider.service';
import { PromptLoaderService } from '../../services/prompt-loader.service';
import { TodoToolsService } from '../../tools/todo-tools.service';

@Injectable()
export class TodoAgentService {
  private readonly checkpointer: PostgresSaver;
  private readonly graph: ReturnType<typeof this.buildGraph>;
  private readonly logger = new Logger(TodoAgentService.name)

  constructor(
    @Inject('AI_PG_POOL') pool: Pool,
    private readonly aiProviderService: AiProviderService,
    private readonly promptLoader: PromptLoaderService,
    private readonly todoToolsService: TodoToolsService,

  ) {
    this.checkpointer = new PostgresSaver(pool);
    this.graph = this.buildGraph();
  }

  async onModuleInit() {
    await this.checkpointer.setup();
  }

  async run(request: string, context: { user: User; conversationId?: string }) {
    const result = await this.graph.invoke(
      { messages: [new HumanMessage(request)] },
      {
        configurable: {
          thread_id: this.threadId(context.user.id, context.conversationId),
          user: context.user,
          systemPrompt: this.buildSystemPrompt(),
        },
      },
    );

    const last = result.messages.at(-1);
    if (!(last instanceof AIMessage)) return '';

    return this.normalizeAssistantText(last.content);
  }

  private buildGraph() {
    const tools = this.todoToolsService.getTools();

    return new StateGraph(MessagesAnnotation)
      .addNode('model', async (state, config?: RunnableConfig) => {
        const { systemPrompt } = (config?.configurable ?? {}) as {
          systemPrompt?: SystemMessage;
        };

        const { result } = await this.aiProviderService.invokeWithFailover(
          async (model) => {
            if (!model.bindTools) {
              throw new AiProviderException(
                'AI_PROVIDER_UNAVAILABLE',
                'Todo model does not support tool calling',
              );
            }
            const modelWithTools = model.bindTools(tools);
            return await modelWithTools.invoke([
              systemPrompt ?? this.buildSystemPrompt(),
              ...state.messages,
            ]);
          },
        );

        return { messages: [result] };
      })
      .addNode('tools', new ToolNode(tools))
      .addEdge(START, 'model')
      .addConditionalEdges('model', toolsCondition)
      .addEdge('tools', 'model')
      .compile({ checkpointer: this.checkpointer });
  }

  private buildSystemPrompt() {
    return new SystemMessage(this.promptLoader.getRequired('task'));
  }

  private threadId(userId: string, conversationId?: string) {
    return `todo_${userId}_${conversationId ?? 'default'}`;
  }

  private normalizeAssistantText(content: AIMessage['content']) {
    this.logger.log("task-agent-raw-response", content)

    if (typeof content === 'string') return content;

    return content
      .map((block) =>
        typeof block === 'string'
          ? block
          : 'text' in block
            ? String(block.text)
            : '',
      )
      .join('')
      .trim();
  }
}
