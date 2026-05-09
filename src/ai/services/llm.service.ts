import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { AiChatMessage, AiTokenUsage } from '../types/ai-message.type';

type ChatGraphState = {
  messages: AiChatMessage[];
  content?: string;
  tokenUsage?: AiTokenUsage;
};

type TitleGraphState = {
  message: string;
  title?: string;
};

const ChatState = Annotation.Root({
  messages: Annotation<AiChatMessage[]>(),
  content: Annotation<string | undefined>(),
  tokenUsage: Annotation<AiTokenUsage | undefined>(),
});

const TitleState = Annotation.Root({
  message: Annotation<string>(),
  title: Annotation<string | undefined>(),
});

@Injectable()
export class LlmService {
  private readonly provider = 'google';
  private readonly modelName: string;
  private readonly enabled: boolean;
  private readonly model?: ChatGoogleGenerativeAI;
  private readonly graph: ReturnType<typeof this.buildGraph>;
  private readonly titleGraph: ReturnType<typeof this.buildTitleGraph>;

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

    this.graph = this.buildGraph();
    this.titleGraph = this.buildTitleGraph();
  }

  getProvider() {
    return this.provider;
  }

  getModelName() {
    return this.modelName;
  }

  async generate(messages: AiChatMessage[]) {
    if (!this.enabled || !this.model) {
      throw new ServiceUnavailableException('AI chat is not enabled');
    }

    const result = (await this.graph.invoke({ messages })) as ChatGraphState;

    return {
      content: result.content ?? '',
      tokenUsage: result.tokenUsage,
    };
  }

  async generateTitle(message: string) {
    if (!this.enabled || !this.model) {
      throw new ServiceUnavailableException('AI chat is not enabled');
    }

    const result = (await this.titleGraph.invoke({
      message,
    })) as TitleGraphState;

    return this.sanitizeTitle(result.title);
  }

  private buildGraph() {
    return new StateGraph(ChatState)
      .addNode('callModel', async (state: ChatGraphState) => {
        const response = await this.callModel(state.messages);

        return {
          content: response.content,
          tokenUsage: response.tokenUsage,
        };
      })
      .addEdge(START, 'callModel')
      .addEdge('callModel', END)
      .compile();
  }

  private buildTitleGraph() {
    return new StateGraph(TitleState)
      .addNode('generateTitle', async (state: TitleGraphState) => {
        const response = await this.callModel([
          {
            role: 'system',
            content: [
              'Generate a short title for a chat conversation.',
              'Rules:',
              '- Use 3 to 6 words.',
              '- Use title case.',
              '- Do not use quotes.',
              '- Do not use ending punctuation.',
              '- Return only the title.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: state.message,
          },
        ]);

        return {
          title: response.content,
        };
      })
      .addEdge(START, 'generateTitle')
      .addEdge('generateTitle', END)
      .compile();
  }

  private async callModel(messages: AiChatMessage[]) {
    if (!this.model) {
      throw new ServiceUnavailableException('AI chat is not enabled');
    }

    const result = await this.model.invoke(
      messages.map((message) => {
        if (message.role === 'system') {
          return new SystemMessage(message.content);
        }

        if (message.role === 'assistant') {
          return new AIMessage(message.content);
        }

        return new HumanMessage(message.content);
      }),
    );

    const content =
      typeof result.content === 'string'
        ? result.content
        : result.content
            .map((block) =>
              typeof block === 'string'
                ? block
                : 'text' in block
                  ? String(block.text)
                  : '',
            )
            .join('');

    return {
      content,
      tokenUsage: result.usage_metadata,
    };
  }

  private sanitizeTitle(title?: string) {
    const sanitized = title
      ?.trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/[.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80);

    return sanitized || undefined;
  }
}
