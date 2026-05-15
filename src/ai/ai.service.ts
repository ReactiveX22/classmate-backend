import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from 'src/auth/auth.factory';
import { ClassroomRepository } from 'src/classroom/classroom.repository';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { SelectAiMessage } from 'src/database/schema';
import { EmbeddingVectorStoreService } from 'src/embedding/services/embedding-vector-store.service';
import { SendAiChatDto } from './dto/send-ai-chat.dto';
import { CreateAiChatDto } from './dto/create-ai-chat.dto';
import { VectorSearchDto } from './dto/vector-search.dto';
import {
  classifyAiProviderError,
  toSafeAiProviderMessage,
} from './errors/ai-provider-error.util';
import { AiProviderException } from './exceptions/ai-provider.exception';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { LlmService } from './services/llm.service';
import {
  AiInternalFinalLlmEvent,
  AiStreamEvent,
  ConversationResponseSource,
} from './types/ai-stream-event.types';

@Injectable()
export class AiService {
  constructor(
    private readonly aiConversationRepository: AiConversationRepository,
    private readonly llmService: LlmService,
    private readonly vectorStoreService: EmbeddingVectorStoreService,
    private readonly classroomRepository: ClassroomRepository,
  ) {}

  async findConversations(user: User) {
    const conversations =
      await this.aiConversationRepository.findConversationsForUser(
        user.id,
        user.organizationId,
      );

    return {
      conversations: conversations.map((c) =>
        this.toConversationSummaryResponse(c),
      ),
    };
  }

  async findConversation(id: string, user: User) {
    const conversation =
      await this.aiConversationRepository.findConversationWithMessagesForUser(
        id,
        user.id,
        user.organizationId,
      );

    if (!conversation) {
      throw new ApplicationNotFoundException('AI conversation not found');
    }

    return {
      conversation: this.toConversationResponse(conversation),
      messages: conversation.messages.map((m) => this.toMessageResponse(m)),
    };
  }

  async vectorSearch(dto: VectorSearchDto, user: User) {
    const userClassrooms = await this.classroomRepository.findJoinedClassrooms(
      user.id,
    );

    if (!userClassrooms.length) {
      return [];
    }

    const classroomIds = userClassrooms.map((c) => c.id);

    const results = await this.vectorStoreService.similaritySearchWithScore(
      dto.query,
      dto.limit ?? 5,
      { classroomId: { in: classroomIds } },
    );

    return results.map(([doc, score]) => {
      const meta = doc.metadata;
      return {
        content: doc.pageContent,
        score: Math.round(score * 1000) / 1000,
        source: (meta['attachmentName'] ??
          meta['fileName'] ??
          meta['source'] ??
          'Unknown') as string,
        metadata: doc.metadata,
      };
    });
  }

  async createChat(dto: CreateAiChatDto, user: User) {
    if (dto.classroomId) {
      await this.assertClassroomAccess(dto.classroomId, user);
    }

    const conversation = await this.aiConversationRepository.createConversation({
      organizationId: user.organizationId,
      userId: user.id,
      classroomId: dto.classroomId ?? null,
      title: dto.message ? this.fallbackTitle(dto.message) : null,
    });

    return {
      conversationId: conversation.id,
      conversation: this.toConversationResponse({
        ...conversation,
        updatedAt: new Date(),
      }),
    };
  }

  async chat(dto: SendAiChatDto, user: User) {
    const conversation = dto.conversationId
      ? await this.findOwnedConversation(dto.conversationId, user)
      : await this.aiConversationRepository.createConversation({
          organizationId: user.organizationId,
          userId: user.id,
          title: this.fallbackTitle(dto.message),
        });

    const userMessage = await this.aiConversationRepository.createMessage({
      conversationId: conversation.id,
      organizationId: user.organizationId,
      userId: user.id,
      role: 'user',
      content: dto.message,
    });

    const threadId = `user_${user.id}_conv_${conversation.id}`;

    const response = await this.llmService.chat(threadId, dto.message, {
      user,
      classroomId: conversation.classroomId ?? undefined,
    });

    const assistantMessage = await this.aiConversationRepository.createMessage({
      conversationId: conversation.id,
      organizationId: user.organizationId,
      role: 'assistant',
      content: response.content,
      provider: response.provider,
      model: response.model,
      tokenUsage: response.tokenUsage,
      metadata: { reasoning: response.reasoning },
    });

    // Refine the provisional title in the background so the UI is immediate
    // but the final label still becomes more descriptive.
    void this.generateAndSaveTitle(conversation.id, dto.message);

    return {
      conversation: this.toConversationResponse({
        ...conversation,
        updatedAt: new Date(),
      }),
      messages: [
        this.toMessageResponse(userMessage),
        this.toMessageResponse(assistantMessage),
      ],
    };
  }

  streamChat(dto: SendAiChatDto, user: User): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const emit = (event: AiStreamEvent) => {
        subscriber.next({ data: event });
      };

      const run = async () => {
        try {
          const conversation = await this.findOwnedConversation(
            dto.conversationId,
            user,
          );

          const userMessage = await this.aiConversationRepository.createMessage(
            {
              conversationId: conversation.id,
              organizationId: user.organizationId,
              userId: user.id,
              role: 'user',
              content: dto.message,
            },
          );

          emit({
            type: 'user_message',
            payload: this.toMessageResponse(userMessage),
          });

          const threadId = `user_${user.id}_conv_${conversation.id}`;
          let accumulatedContent = '';
          let accumulatedReasoning = '';
          let finalLlmMeta: AiInternalFinalLlmEvent['payload'] | null = null;
          const toolCalls = new Map<
            string,
            { name: string; status: 'start' | 'end' }
          >();

          for await (const event of this.llmService.streamChat(
            threadId,
            dto.message,
            {
              user,
              classroomId: conversation.classroomId ?? undefined,
            },
          )) {
            if (event.type === '_internal_final_llm') {
              finalLlmMeta = event.payload;
              continue;
            }

            if (event.type === 'content') {
              accumulatedContent += event.payload.delta;
            }

            if (event.type === 'reasoning') {
              accumulatedReasoning += event.payload.delta;
            }

            if (event.type === 'tool') {
              toolCalls.set(event.payload.name, {
                name: event.payload.name,
                status: event.payload.status,
              });
            }

            emit(event);
          }

          const assistantMessage =
            await this.aiConversationRepository.createMessage({
              conversationId: conversation.id,
              organizationId: user.organizationId,
              role: 'assistant',
              content: finalLlmMeta?.content ?? accumulatedContent,
              provider: finalLlmMeta?.provider,
              model: finalLlmMeta?.model,
              tokenUsage: finalLlmMeta?.tokenUsage,
              metadata: {
                toolCalls: Array.from(toolCalls.values()),
                reasoning:
                  finalLlmMeta?.reasoning || accumulatedReasoning || undefined,
              },
            });

          emit({
            type: 'final',
            payload: this.toMessageResponse(assistantMessage),
          });

          void this.generateAndSaveTitle(conversation.id, dto.message).then(
            (updatedConversation) => {
              if (updatedConversation) {
                emit({
                  type: 'title_updated',
                  payload: this.toConversationResponse(updatedConversation),
                });
              }
            },
          );

          subscriber.complete();
        } catch (err) {
          const classified = classifyAiProviderError(err);
          const message =
            err instanceof AiProviderException ||
            classified.code !== 'AI_PROVIDER_UNKNOWN'
              ? classified.message
              : err instanceof Error
                ? err.message
                : toSafeAiProviderMessage(err);
          emit({ type: 'error', payload: { message } });
          subscriber.complete();
        }
      };

      void run();
    });
  }

  async updateConversation(id: string, dto: { title: string }, user: User) {
    await this.findOwnedConversation(id, user);
    const conversation =
      await this.aiConversationRepository.updateConversationTitle(
        id,
        dto.title,
      );

    return this.toConversationResponse(conversation);
  }

  async deleteConversation(id: string, user: User) {
    await this.findOwnedConversation(id, user);
    await this.aiConversationRepository.deleteConversation(id, user.id);
  }

  private async findOwnedConversation(conversationId: string, user: User) {
    const conversation =
      await this.aiConversationRepository.findConversationForUser(
        conversationId,
        user.id,
        user.organizationId,
      );

    if (!conversation) {
      throw new ApplicationNotFoundException('AI conversation not found');
    }

    return conversation;
  }

  private async assertClassroomAccess(classroomId: string, user: User) {
    const canAccess =
      await this.aiConversationRepository.userCanAccessClassroom(
        classroomId,
        user.id,
        user.organizationId,
      );

    if (!canAccess) {
      throw new ApplicationForbiddenException(
        'You do not have access to this classroom',
      );
    }
  }

  /**
   * Fires title generation in the background — the LLM call and DB write happen
   * after the chat response is already returned to the client. Falls back to a
   * truncated version of the first message if the LLM call fails.
   */
  private async generateAndSaveTitle(
    conversationId: string,
    message: string,
  ): Promise<ConversationResponseSource | null> {
    try {
      const title =
        (await this.llmService.generateTitle(message)) ??
        this.fallbackTitle(message);
      return await this.aiConversationRepository.updateConversationTitle(
        conversationId,
        title,
      );
    } catch {
      const title = this.fallbackTitle(message);
      return this.aiConversationRepository.updateConversationTitle(
        conversationId,
        title,
      );
    }
  }

  private fallbackTitle(message: string): string {
    return message.trim().replace(/\s+/g, ' ').slice(0, 80) || 'New AI chat';
  }

  private toConversationSummaryResponse(
    conversation: ConversationResponseSource,
  ) {
    return {
      id: conversation.id,
      title: conversation.title,
      classroomId: conversation.classroomId,
      updatedAt: conversation.updatedAt,
    };
  }

  private toConversationResponse(conversation: ConversationResponseSource) {
    return {
      ...this.toConversationSummaryResponse(conversation),
      createdAt: conversation.createdAt,
    };
  }

  private toMessageResponse(message: SelectAiMessage) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? {},
      createdAt: message.createdAt,
    };
  }
}
