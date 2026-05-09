import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { CreateAiConversationDto } from './dto/create-ai-conversation.dto';
import { SendAiMessageDto } from './dto/send-ai-message.dto';
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

  async createConversation(dto: CreateAiConversationDto, user: User) {
    if (dto.classroomId) {
      await this.assertClassroomAccess(dto.classroomId, user);
    }

    return this.aiConversationRepository.createConversation({
      organizationId: user.organizationId,
      userId: user.id,
      classroomId: dto.classroomId,
      title: dto.title,
    });
  }

  async findConversations(user: User) {
    return this.aiConversationRepository.findConversationsForUser(
      user.id,
      user.organizationId,
    );
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

    return conversation;
  }

  async sendMessage(conversationId: string, dto: SendAiMessageDto, user: User) {
    const conversation =
      await this.aiConversationRepository.findConversationForUser(
        conversationId,
        user.id,
        user.organizationId,
      );

    if (!conversation) {
      throw new ApplicationNotFoundException('AI conversation not found');
    }

    const classroomId = dto.classroomId ?? conversation.classroomId;

    if (classroomId) {
      await this.assertClassroomAccess(classroomId, user);
    }

    const userMessage = await this.aiConversationRepository.createMessage({
      conversationId,
      organizationId: user.organizationId,
      userId: user.id,
      role: 'user',
      content: dto.message,
    });

    const priorMessages =
      await this.aiConversationRepository.findMessagesByConversation(
        conversationId,
      );

    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: this.aiContextService.buildSystemPrompt(user, classroomId),
      },
      ...priorMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const response = await this.llmService.generate(messages);

    const assistantMessage = await this.aiConversationRepository.createMessage({
      conversationId,
      organizationId: user.organizationId,
      role: 'assistant',
      content: response.content,
      provider: this.llmService.getProvider(),
      model: this.llmService.getModelName(),
      tokenUsage: response.tokenUsage,
    });

    if (!conversation.title) {
      await this.aiConversationRepository.updateConversationTitle(
        conversationId,
        this.buildConversationTitle(dto.message),
      );
    } else {
      await this.aiConversationRepository.touchConversation(conversationId);
    }

    return {
      conversationId,
      userMessage,
      message: assistantMessage,
    };
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
}
