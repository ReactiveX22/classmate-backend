import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { classroomPost } from './classroom-post-schema';
import { classroom } from './classroom-schema';
import { notice } from './notice-schema';
import { organization } from './organization-schema';

export const embeddingResourceType = pgEnum('embedding_resource_type', [
  'classroom_post_attachment',
  'notice_attachment',
]);

export const embeddingStatus = pgEnum('embedding_status', [
  'pending',
  'processing',
  'completed',
  'skipped',
  'failed',
]);

export const embeddingTracking = pgTable(
  'embedding_tracking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceType: embeddingResourceType('resource_type').notNull(),
    organizationId: uuid('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    classroomId: uuid('classroom_id').references(() => classroom.id, {
      onDelete: 'cascade',
    }),
    postId: uuid('post_id').references(() => classroomPost.id, {
      onDelete: 'cascade',
    }),
    noticeId: uuid('notice_id').references(() => notice.id, {
      onDelete: 'cascade',
    }),
    attachmentId: text('attachment_id').notNull(),
    sourceHash: text('source_hash'),
    embeddingProvider: text('embedding_provider').notNull(),
    embeddingModel: text('embedding_model').notNull(),
    embeddingDimensions: integer('embedding_dimensions').notNull(),
    vectorDocumentIds: jsonb('vector_document_ids')
      .$type<string[]>()
      .default([])
      .notNull(),
    chunkCount: integer('chunk_count').default(0).notNull(),
    status: embeddingStatus('status').default('pending').notNull(),
    error: text('error'),
    attemptCount: integer('attempt_count').default(0).notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    unique('embedding_tracking_unq').on(
      t.resourceType,
      t.organizationId,
      t.attachmentId,
      t.embeddingProvider,
      t.embeddingModel,
      t.embeddingDimensions,
    ),
  ],
);

export const embeddingTrackingRelations = relations(
  embeddingTracking,
  ({ one }) => ({
    organization: one(organization, {
      fields: [embeddingTracking.organizationId],
      references: [organization.id],
    }),
    classroom: one(classroom, {
      fields: [embeddingTracking.classroomId],
      references: [classroom.id],
    }),
    classroomPost: one(classroomPost, {
      fields: [embeddingTracking.postId],
      references: [classroomPost.id],
    }),
    notice: one(notice, {
      fields: [embeddingTracking.noticeId],
      references: [notice.id],
    }),
  }),
);

export type SelectEmbeddingTracking = typeof embeddingTracking.$inferSelect;
export type InsertEmbeddingTracking = typeof embeddingTracking.$inferInsert;
