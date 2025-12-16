import { relations } from 'drizzle-orm';
import {
  date,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { course } from './course-schema';
import { user } from './auth-schema';

export const teacher = pgTable('teacher', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title'),
  joinDate: date('join_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const teacherRelations = relations(teacher, ({ one, many }) => ({
  user: one(user, {
    fields: [teacher.userId],
    references: [user.id],
  }),
  courses: many(course),
}));
