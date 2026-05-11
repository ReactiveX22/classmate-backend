import { Injectable } from '@nestjs/common';
import { and, desc, eq, or } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  aiConversation,
  aiMessage,
  classroom,
  classroomMembers,
  course,
  type InsertAiConversation,
  type InsertAiMessage,
} from 'src/database/schema';

@Injectable()
export class AiConversationRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async createConversation(data: InsertAiConversation) {
    const [result] = await this.db
      .insert(aiConversation)
      .values(data)
      .returning();
    return result;
  }

  async findConversationsForUser(
    userId: string,
    organizationId?: string | null,
  ) {
    const filters = [
      eq(aiConversation.userId, userId),
      eq(aiConversation.status, 'active' as const),
    ];

    if (organizationId) {
      filters.push(eq(aiConversation.organizationId, organizationId));
    }

    return this.db
      .select()
      .from(aiConversation)
      .where(and(...filters))
      .orderBy(desc(aiConversation.updatedAt));
  }

  async findConversationForUser(
    id: string,
    userId: string,
    organizationId?: string | null,
  ) {
    const filters = [
      eq(aiConversation.id, id),
      eq(aiConversation.userId, userId),
    ];

    if (organizationId) {
      filters.push(eq(aiConversation.organizationId, organizationId));
    }

    const [result] = await this.db
      .select()
      .from(aiConversation)
      .where(and(...filters))
      .limit(1);

    return result;
  }

  async findConversationWithMessagesForUser(
    id: string,
    userId: string,
    organizationId?: string | null,
  ) {
    const conversation = await this.findConversationForUser(
      id,
      userId,
      organizationId,
    );

    if (!conversation) {
      return null;
    }

    const messages = await this.findMessagesByConversation(id);
    return { ...conversation, messages };
  }

  async findMessagesByConversation(conversationId: string) {
    return this.db
      .select()
      .from(aiMessage)
      .where(eq(aiMessage.conversationId, conversationId))
      .orderBy(aiMessage.createdAt);
  }

  async createMessage(data: InsertAiMessage) {
    const [result] = await this.db.insert(aiMessage).values(data).returning();
    return result;
  }

  async updateConversationTitle(id: string, title: string) {
    const [result] = await this.db
      .update(aiConversation)
      .set({ title })
      .where(eq(aiConversation.id, id))
      .returning();
    return result;
  }

  async deleteConversation(id: string, userId: string) {
    await this.db
      .delete(aiConversation)
      .where(and(eq(aiConversation.id, id), eq(aiConversation.userId, userId)));
  }

  async userCanAccessClassroom(
    classroomId: string,
    userId: string,
    organizationId?: string | null,
  ) {
    const filters = [
      eq(classroom.id, classroomId),
      or(
        eq(classroom.teacherId, userId),
        eq(classroomMembers.studentId, userId),
      )!,
    ];

    if (organizationId) {
      filters.push(eq(course.organizationId, organizationId));
    }

    const [result] = await this.db
      .select({ id: classroom.id })
      .from(classroom)
      .innerJoin(course, eq(course.id, classroom.courseId))
      .leftJoin(
        classroomMembers,
        eq(classroomMembers.classroomId, classroom.id),
      )
      .where(and(...filters))
      .limit(1);

    return !!result;
  }
}
