import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { type DB, InjectDb } from '../../database/db.provider';
import {
  embeddingTracking,
  InsertEmbeddingTracking,
  SelectEmbeddingTracking,
} from '../../database/schema/embedding-tracking-schema';

@Injectable()
export class EmbeddingTrackingRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  /**
   * Finds a tracking record by its unique natural key.
   */
  async findTrackingByNaturalKey(params: {
    organizationId: string;
    classroomId: string;
    postId: string;
    attachmentId: string;
    embeddingProvider: string;
    embeddingModel: string;
  }): Promise<SelectEmbeddingTracking | undefined> {
    const results = await this.db
      .select()
      .from(embeddingTracking)
      .where(
        and(
          eq(embeddingTracking.organizationId, params.organizationId),
          eq(embeddingTracking.classroomId, params.classroomId),
          eq(embeddingTracking.postId, params.postId),
          eq(embeddingTracking.attachmentId, params.attachmentId),
          eq(embeddingTracking.embeddingProvider, params.embeddingProvider),
          eq(embeddingTracking.embeddingModel, params.embeddingModel),
        ),
      )
      .limit(1);

    return results[0];
  }

  /**
   * Upserts a tracking record.
   */
  async upsertTracking(
    data: InsertEmbeddingTracking,
  ): Promise<SelectEmbeddingTracking> {
    const results = await this.db
      .insert(embeddingTracking)
      .values(data)
      .onConflictDoUpdate({
        target: [
          embeddingTracking.resourceType,
          embeddingTracking.organizationId,
          embeddingTracking.classroomId,
          embeddingTracking.postId,
          embeddingTracking.attachmentId,
          embeddingTracking.embeddingProvider,
          embeddingTracking.embeddingModel,
          embeddingTracking.embeddingDimensions,
        ],
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();

    return results[0];
  }

  /**
   * Updates the status of a tracking record.
   */
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

  /**
   * Increments the attempt count for a tracking record.
   */
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

  /**
   * Finds all tracking records for a specific attachment.
   */
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

  /**
   * Deletes tracking records for a specific attachment.
   */
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

  /**
   * Finds all tracking records for a specific post.
   */
  async findByPost(postId: string): Promise<SelectEmbeddingTracking[]> {
    return await this.db
      .select()
      .from(embeddingTracking)
      .where(eq(embeddingTracking.postId, postId));
  }

  /**
   * Deletes all tracking records for a post.
   */
  async deleteByPost(postId: string): Promise<void> {
    await this.db
      .delete(embeddingTracking)
      .where(eq(embeddingTracking.postId, postId));
  }
}
