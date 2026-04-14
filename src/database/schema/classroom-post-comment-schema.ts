import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroomPost } from './classroom-post-schema';

export const classroomPostComment = pgTable('classroom_post_comment', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .references(() => classroomPost.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: text('author_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const classroomPostCommentRelations = relations(
  classroomPostComment,
  ({ one }) => ({
    post: one(classroomPost, {
      fields: [classroomPostComment.postId],
      references: [classroomPost.id],
    }),
    author: one(user, {
      fields: [classroomPostComment.authorId],
      references: [user.id],
    }),
  }),
);

export type SelectClassroomPostComment =
  typeof classroomPostComment.$inferSelect;
export type InsertClassroomPostComment =
  typeof classroomPostComment.$inferInsert;
