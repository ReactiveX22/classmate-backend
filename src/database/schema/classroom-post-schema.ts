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
import { assignmentSubmission } from './assignment-submission-schema';
import { classroomPostComment } from './classroom-post-comment-schema';
import { classroomResourceBookmark } from './classroom-resource-bookmark-schema';
import { Attachment } from './types';

export const postType = pgEnum('post_type', [
  'announcement',
  'assignment',
  'material',
  'question',
]);

export type AssignmentData = {
  dueDate?: string;
  points?: number;
  allowLateSubmission?: boolean;
  submissionType?: 'file' | 'text' | 'link' | 'multiple';
};

export type QuestionData =
  | {
      mode: 'short_answer';
    }
  | {
      mode: 'poll';
      selectionMode: 'single' | 'multiple';
      options: Array<{
        id: string;
        text: string;
        position: number;
      }>;
      votes: Array<{
        userId: string;
        optionIds: string[];
        votedAt: string;
      }>;
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
  questionData: jsonb('question_data').$type<QuestionData>(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  commentsEnabled: boolean('comments_enabled').default(true).notNull(),
  tags: text('tags').array().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const classroomPostRelations = relations(
  classroomPost,
  ({ one, many }) => ({
    classroom: one(classroom, {
      fields: [classroomPost.classroomId],
      references: [classroom.id],
    }),
    author: one(user, {
      fields: [classroomPost.authorId],
      references: [user.id],
    }),
    submissions: many(assignmentSubmission),
    comments: many(classroomPostComment),
    bookmarks: many(classroomResourceBookmark),
    // future:
    // reactions: many(classroomPostReaction),
  }),
);

export type SelectClassroomPost = typeof classroomPost.$inferSelect;
export type InsertClassroomPost = typeof classroomPost.$inferInsert;
