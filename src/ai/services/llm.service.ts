import type { UsageMetadata } from '@langchain/core/messages';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LlmChatResponse = {
  content: string;
  tokenUsage?: UsageMetadata;
  provider: string;
  model: string;
};

@Injectable()
export class LlmService {
  private readonly provider = 'google';
  private readonly modelName: string;
  private readonly enabled: boolean;
  private readonly model?: ChatGoogleGenerativeAI;
  private readonly graph: ReturnType<typeof this.buildChatGraph>;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('AI_ENABLED') ?? false;
    this.modelName =
      this.configService.get<string>('AI_MODEL') ?? 'gemini-2.5-flash';

    if (this.enabled) {
      this.model = new ChatGoogleGenerativeAI({
        model: this.modelName,
        apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
        temperature: this.configService.get<number>('AI_TEMPERATURE') ?? 0.2,
        maxOutputTokens:
          this.configService.get<number>('AI_MAX_OUTPUT_TOKENS') ?? 2048,
      });
    }

    this.graph = this.buildChatGraph();
  }

  /**
   * Send a chat turn through the graph.
   * The graph currently routes: START → model → END.
   * To add tool calls: bind tools to the model, add a ToolNode, and wire
   * toolsCondition as a conditional edge — no other changes needed.
   */
  async chat(messages: BaseMessage[]): Promise<LlmChatResponse> {
    if (!this.enabled || !this.model) {
      throw new ServiceUnavailableException('AI chat is not enabled');
    }

    const result = await this.graph.invoke({ messages });
    const last = result.messages.at(-1) as AIMessage;

    return {
      content: this.extractText(last.content),
      tokenUsage: last.usage_metadata ?? undefined,
      provider: this.provider,
      model: this.modelName,
    };
  }

  /**
   * One-shot title generation — not a multi-turn chat flow, so no graph needed.
   * Returns undefined on failure so the caller can fall back gracefully.
   */
  async generateTitle(userMessage: string): Promise<string | undefined> {
    if (!this.enabled || !this.model) return undefined;

    try {
      const response = await this.model.invoke([
        new SystemMessage(
          [
            'Generate a short title for a chat conversation.',
            'Rules:',
            '- Use 3 to 6 words.',
            '- Use title case.',
            '- Do not use quotes.',
            '- Do not use ending punctuation.',
            '- Return only the title.',
          ].join('\n'),
        ),
        new HumanMessage(userMessage),
      ]);

      return this.sanitizeTitle(this.extractText(response.content));
    } catch {
      return undefined;
    }
  }

  /**
   * Chat graph: START → model → END.
   *
   * MessagesAnnotation is the canonical LangGraph state for chat agents.
   * Its built-in reducer appends each new BaseMessage to the array, which
   * means ToolNode and toolsCondition plug in with zero extra state management:
   *
   *   .addNode('tools', new ToolNode(tools))
   *   .addConditionalEdges('model', toolsCondition)
   *   .addEdge('tools', 'model')
   */
  private buildChatGraph() {
    return new StateGraph(MessagesAnnotation)
      .addNode('model', async (state) => {
        if (!this.model) {
          throw new ServiceUnavailableException('AI chat is not enabled');
        }
        const response = await this.model.invoke(state.messages);
        return { messages: [response] };
      })
      .addEdge(START, 'model')
      .addEdge('model', END)
      .compile();
  }

  private extractText(content: AIMessage['content']): string {
    if (typeof content === 'string') return content;
    return content
      .map((block) =>
        typeof block === 'string'
          ? block
          : 'text' in block
            ? String(block.text)
            : '',
      )
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
