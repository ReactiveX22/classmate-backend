import { relations } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  unique,
  uuid,
  text,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroomPost } from './classroom-post-schema';

export const classroomResourceBookmark = pgTable(
  'classroom_resource_bookmark',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .references(() => classroomPost.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    postUserUnique: unique('classroom_resource_bookmark_post_user_unique').on(
      table.postId,
      table.userId,
    ),
  }),
);

export const classroomResourceBookmarkRelations = relations(
  classroomResourceBookmark,
  ({ one }) => ({
    post: one(classroomPost, {
      fields: [classroomResourceBookmark.postId],
      references: [classroomPost.id],
    }),
    user: one(user, {
      fields: [classroomResourceBookmark.userId],
      references: [user.id],
    }),
  }),
);

export type SelectClassroomResourceBookmark =
  typeof classroomResourceBookmark.$inferSelect;
export type InsertClassroomResourceBookmark =
  typeof classroomResourceBookmark.$inferInsert;
