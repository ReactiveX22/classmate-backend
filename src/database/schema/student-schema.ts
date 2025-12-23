import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { enrollment } from './enrollment-schema';
import { classroomMembers } from './classroom-members-schema';

export const student = pgTable('student', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  studentId: text('student_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const studentRelations = relations(student, ({ one, many }) => ({
  user: one(user, {
    fields: [student.userId],
    references: [user.id],
  }),
  enrollment: many(enrollment),
  classroomMembers: many(classroomMembers),
}));

export type SelectStudent = typeof student.$inferSelect;
