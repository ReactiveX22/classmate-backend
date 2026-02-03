import { relations } from 'drizzle-orm';
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroom } from './classroom-schema';
import { course } from './course-schema';

export const teacher = pgTable(
  'teacher',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title'),
    joinDate: date('join_date'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('teacher_userId_idx').on(table.userId)],
);

export const teacherRelations = relations(teacher, ({ one, many }) => ({
  user: one(user, {
    fields: [teacher.userId],
    references: [user.id],
  }),
}));

export type SelectTeacher = typeof teacher.$inferSelect;
