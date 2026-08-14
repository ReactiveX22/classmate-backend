import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type DB, InjectDb } from '../../database/db.provider';
import {
  embeddingTracking,
  InsertEmbeddingTracking,
  SelectEmbeddingTracking,
} from '../../database/schema/embedding-tracking-schema';

@Injectable()
export class EmbeddingTrackingRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async findTrackingByNaturalKey(params: {
    organizationId: string;
    resourceType: 'classroom_post_attachment' | 'notice_attachment';
    classroomId?: string;
    postId?: string;
    noticeId?: string;
    attachmentId: string;
    embeddingProvider: string;
    embeddingModel: string;
  }): Promise<SelectEmbeddingTracking | undefined> {
    const conditions = [
      eq(embeddingTracking.organizationId, params.organizationId),
      eq(embeddingTracking.resourceType, params.resourceType),
      eq(embeddingTracking.attachmentId, params.attachmentId),
      eq(embeddingTracking.embeddingProvider, params.embeddingProvider),
      eq(embeddingTracking.embeddingModel, params.embeddingModel),
    ];

    if (params.resourceType === 'classroom_post_attachment') {
      conditions.push(eq(embeddingTracking.postId, params.postId!));
    } else {
      conditions.push(eq(embeddingTracking.noticeId, params.noticeId!));
      conditions.push(isNull(embeddingTracking.classroomId));
      conditions.push(isNull(embeddingTracking.postId));
    }

    const results = await this.db
      .select()
      .from(embeddingTracking)
      .where(and(...conditions))
      .limit(1);

    return results[0];
  }

  async upsertTracking(
    data: InsertEmbeddingTracking,
  ): Promise<SelectEmbeddingTracking> {
    const { ...updateData } = data;
    const results = await this.db
      .insert(embeddingTracking)
      .values(data)
      .onConflictDoUpdate({
        target: [
          embeddingTracking.resourceType,
          embeddingTracking.organizationId,
          embeddingTracking.attachmentId,
          embeddingTracking.embeddingProvider,
          embeddingTracking.embeddingModel,
          embeddingTracking.embeddingDimensions,
        ],
        set: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
      .returning();

    return results[0];
  }

  async updateStatus(
    id: string,
    status: SelectEmbeddingTracking['status'],
    error?: string,
  ): Promise<void> {
    await this.db
      .update(embeddingTracking)
      .set({
        status,
        error: error ?? null,
        updatedAt: new Date(),
        processedAt: status === 'completed' ? new Date() : undefined,
      })
      .where(eq(embeddingTracking.id, id));
  }

  async incrementAttempt(id: string): Promise<void> {
    const record = await this.db
      .select({ attemptCount: embeddingTracking.attemptCount })
      .from(embeddingTracking)
      .where(eq(embeddingTracking.id, id))
      .limit(1);

    if (record[0]) {
      await this.db
        .update(embeddingTracking)
        .set({
          attemptCount: record[0].attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(embeddingTracking.id, id));
    }
  }

  async findByAttachment(
    postId: string,
    attachmentId: string,
  ): Promise<SelectEmbeddingTracking[]> {
    return await this.db
      .select()
      .from(embeddingTracking)
      .where(
        and(
          eq(embeddingTracking.postId, postId),
          eq(embeddingTracking.attachmentId, attachmentId),
        ),
      );
  }

  async deleteByAttachment(params: {
    postId: string;
    attachmentId: string;
  }): Promise<void> {
    await this.db
      .delete(embeddingTracking)
      .where(
        and(
          eq(embeddingTracking.postId, params.postId),
          eq(embeddingTracking.attachmentId, params.attachmentId),
        ),
      );
  }

  async findByPost(postId: string): Promise<SelectEmbeddingTracking[]> {
    return await this.db
      .select()
      .from(embeddingTracking)
      .where(eq(embeddingTracking.postId, postId));
  }

  async deleteByPost(postId: string): Promise<void> {
    await this.db
      .delete(embeddingTracking)
      .where(eq(embeddingTracking.postId, postId));
  }

  async findByNotice(noticeId: string): Promise<SelectEmbeddingTracking[]> {
    return await this.db
      .select()
      .from(embeddingTracking)
      .where(eq(embeddingTracking.noticeId, noticeId));
  }

  async deleteByNotice(noticeId: string): Promise<void> {
    await this.db
      .delete(embeddingTracking)
      .where(eq(embeddingTracking.noticeId, noticeId));
  }
}
