import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import {
  ApplicationBadRequestException,
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { SelectAiConversation, SelectAiMessage } from 'src/database/schema';
import { SendAiChatDto } from './dto/send-ai-chat.dto';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { AiContextService } from './services/ai-context.service';
import { LlmService } from './services/llm.service';
import { AiChatMessage } from './types/ai-message.type';

@Injectable()
export class AiService {
  constructor(
    private readonly aiConversationRepository: AiConversationRepository,
    private readonly aiContextService: AiContextService,
    private readonly llmService: LlmService,
  ) {}

  async findConversations(user: User) {
    const conversations =
      await this.aiConversationRepository.findConversationsForUser(
        user.id,
        user.organizationId,
      );

    return {
      conversations: conversations.map((conversation) =>
        this.toConversationSummaryResponse(conversation),
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
      messages: conversation.messages.map((message) =>
        this.toMessageResponse(message),
      ),
    };
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

    const priorMessages =
      await this.aiConversationRepository.findMessagesByConversation(
        conversation.id,
      );

    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: this.aiContextService.buildSystemPrompt(user, dto.classroomId),
      },
      ...priorMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const response = await this.llmService.generate(messages);

    const assistantMessage = await this.aiConversationRepository.createMessage({
      conversationId: conversation.id,
      organizationId: user.organizationId,
      role: 'assistant',
      content: response.content,
      provider: this.llmService.getProvider(),
      model: this.llmService.getModelName(),
      tokenUsage: response.tokenUsage,
    });

    let conversationTitle = conversation.title;

    if (!conversationTitle) {
      const updatedConversation =
        await this.aiConversationRepository.updateConversationTitle(
          conversation.id,
          await this.generateConversationTitle(dto.message),
        );

      conversationTitle = updatedConversation.title;
    } else {
      await this.aiConversationRepository.touchConversation(conversation.id);
    }

    return {
      conversation: this.toConversationResponse({
        ...conversation,
        title: conversationTitle,
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

  private buildConversationTitle(message: string) {
    const title = message.trim().replace(/\s+/g, ' ').slice(0, 80);
    return title || 'New AI chat';
  }

  private async generateConversationTitle(message: string) {
    try {
      return (
        (await this.llmService.generateTitle(message)) ??
        this.buildConversationTitle(message)
      );
    } catch {
      return this.buildConversationTitle(message);
    }
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
