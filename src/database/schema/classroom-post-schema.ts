import { relations } from 'drizzle-orm';
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroom } from './classroom-schema';

export const postType = pgEnum('post_type', [
  'announcement',
  'assignment',
  'material',
  'question',
]);

export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link' | 'video' | 'image';
  size?: number;
  mimeType?: string;
};

export type AssignmentData = {
  dueDate?: string;
  points?: number;
  allowLateSubmission?: boolean;
  submissionType?: 'file' | 'text' | 'link' | 'multiple';
};

export const classroomPost = pgTable('classroom_post', {
  id: uuid('id').primaryKey().defaultRandom(),
  classroomId: uuid('classroom_id')
    .references(() => classroom.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: text('author_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  type: postType('type').default('announcement').notNull(),
  title: text('title'),
  content: text('content').notNull(),
  attachments: jsonb('attachments').$type<Attachment[]>().default([]),
  assignmentData: jsonb('assignment_data').$type<AssignmentData>(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  commentsEnabled: boolean('comments_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const classroomPostRelations = relations(classroomPost, ({ one }) => ({
  classroom: one(classroom, {
    fields: [classroomPost.classroomId],
    references: [classroom.id],
  }),
  author: one(user, {
    fields: [classroomPost.authorId],
    references: [user.id],
  }),
  // future:
  // comments: many(classroomPostComment),
  // reactions: many(classroomPostReaction),
  // submissions: many(assignmentSubmission), // if type is 'assignment'
}));

export type SelectClassroomPost = typeof classroomPost.$inferSelect;
export type InsertClassroomPost = typeof classroomPost.$inferInsert;
