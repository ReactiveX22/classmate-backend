import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import { AiProviderException } from '../../exceptions/ai-provider.exception';
import { AiProviderService } from '../../services/ai-provider.service';
import { PromptLoaderService } from '../../services/prompt-loader.service';
import { TodoToolsService } from '../../tools/todo-tools.service';

@Injectable()
export class TodoAgentService {
  private readonly logger = new Logger(TodoAgentService.name);
  private readonly tools: StructuredToolInterface[];
  private readonly toolMap: Map<string, StructuredToolInterface>;

  constructor(
    private readonly aiProviderService: AiProviderService,
    private readonly promptLoader: PromptLoaderService,
    private readonly todoToolsService: TodoToolsService,
  ) {
    this.tools = this.todoToolsService.getTools();
    this.toolMap = new Map(this.tools.map((t) => [t.name, t]));
  }

  async run(request: string, context: { user: User }) {
    this.logger.log(`[TodoAgent] Incoming request: "${request}"`);

    const systemPrompt = this.buildSystemPrompt();
    const messages: (HumanMessage | AIMessage | ToolMessage)[] = [
      new HumanMessage(request),
    ];

    for (let i = 0; i < 5; i++) {
      const { result } = await this.aiProviderService.invokeWithFailover(
        async (model) => {
          if (!model.bindTools) {
            throw new AiProviderException(
              'AI_PROVIDER_UNAVAILABLE',
              'Todo model does not support tool calling',
            );
          }
          const modelWithTools = model.bindTools(this.tools as never);
          return await modelWithTools.invoke([systemPrompt, ...messages]);
        },
      );

      if (!result.tool_calls?.length) {
        const text = this.normalizeAssistantText(result.content);
        this.logger.log(`[TodoAgent] Returning: "${text}"`);
        return text;
      }

      this.logger.log(
        `[TodoAgent] Tool calls: ${JSON.stringify(result.tool_calls.map((tc) => tc.name))}`,
      );

      messages.push(result);

      for (const toolCall of result.tool_calls) {
        const tool = this.toolMap.get(toolCall.name);
        if (!tool) {
          messages.push(
            new ToolMessage({
              tool_call_id: toolCall.id ?? '',
              content: `Tool "${toolCall.name}" not found`,
              name: toolCall.name,
            }),
          );
          continue;
        }

        const toolResult = await tool.invoke(toolCall.args, {
          configurable: {
            user: context.user,
            tool_call_id: toolCall.id,
          },
        });

        this.logger.log(
          `[TodoAgent] Tool "${toolCall.name}" returned: ${JSON.stringify(toolResult).substring(0, 200)}`,
        );

        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? '',
            content:
              typeof toolResult === 'string'
                ? toolResult
                : JSON.stringify(toolResult),
            name: toolCall.name,
          }),
        );
      }
    }

    this.logger.warn('[TodoAgent] Max iterations reached');
    return '';
  }

  private buildSystemPrompt() {
    return new SystemMessage(this.promptLoader.getRequired('task'));
  }

  private normalizeAssistantText(content: AIMessage['content']) {
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
