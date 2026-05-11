import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import {
  ApplicationBadRequestException,
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { SelectAiConversation, SelectAiMessage } from 'src/database/schema';
import { EmbeddingVectorStoreService } from 'src/embedding/services/embedding-vector-store.service';
import { SendAiChatDto } from './dto/send-ai-chat.dto';
import { VectorSearchDto } from './dto/vector-search.dto';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { LlmService } from './services/llm.service';

@Injectable()
export class AiService {
  constructor(
    private readonly aiConversationRepository: AiConversationRepository,
    private readonly llmService: LlmService,
    private readonly vectorStoreService: EmbeddingVectorStoreService,
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
    await this.assertClassroomAccess(dto.classroomId, user);

    const results = await this.vectorStoreService.similaritySearchWithScore(
      dto.query,
      dto.limit ?? 5,
      { classroomId: dto.classroomId },
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

  async chat(dto: SendAiChatDto, user: User) {
    await this.assertClassroomAccess(dto.classroomId, user);

    const conversation = dto.conversationId
      ? await this.findOwnedConversation(dto.conversationId, user)
      : await this.aiConversationRepository.createConversation({
          organizationId: user.organizationId,
          userId: user.id,
          classroomId: dto.classroomId,
        });

    if (conversation.classroomId !== dto.classroomId) {
      throw new ApplicationBadRequestException(
        'Conversation classroom does not match the requested classroom',
      );
    }

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
      classroomId: conversation.classroomId,
    });

    const assistantMessage = await this.aiConversationRepository.createMessage({
      conversationId: conversation.id,
      organizationId: user.organizationId,
      role: 'assistant',
      content: response.content,
      provider: response.provider,
      model: response.model,
      tokenUsage: response.tokenUsage,
    });

    // Title generation is non-critical — fire and forget so it doesn't block
    // the response. The conversation list will pick up the title on next fetch.
    if (!conversation.title) {
      this.generateAndSaveTitle(conversation.id, dto.message);
    } else {
      await this.aiConversationRepository.touchConversation(conversation.id);
    }

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
  private generateAndSaveTitle(conversationId: string, message: string) {
    this.llmService
      .generateTitle(message)
      .then((title) => title ?? this.fallbackTitle(message))
      .then((title) =>
        this.aiConversationRepository.updateConversationTitle(
          conversationId,
          title,
        ),
      )
      .catch(() => {
        const title = this.fallbackTitle(message);
        return this.aiConversationRepository.updateConversationTitle(
          conversationId,
          title,
        );
      });
  }

  private fallbackTitle(message: string): string {
    return message.trim().replace(/\s+/g, ' ').slice(0, 80) || 'New AI chat';
  }

  private toConversationSummaryResponse(conversation: SelectAiConversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      classroomId: conversation.classroomId,
      updatedAt: conversation.updatedAt,
    };
  }

  private toConversationResponse(conversation: SelectAiConversation) {
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
      createdAt: message.createdAt,
    };
  }
}
