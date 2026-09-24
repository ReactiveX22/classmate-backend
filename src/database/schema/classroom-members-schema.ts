import { relations } from 'drizzle-orm';
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroom } from './classroom-schema';

export const classroomMembers = pgTable(
  'classroom_members',
  {
    classroomId: uuid('classroom_id')
      .notNull()
      .references(() => classroom.id, { onDelete: 'cascade' }),

    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.classroomId, t.studentId] }),
    index('classroom_members_student_idx').on(t.studentId, t.classroomId),
  ],
);

export const classroomMembersRelations = relations(
  classroomMembers,
  ({ one }) => ({
    classroom: one(classroom, {
      fields: [classroomMembers.classroomId],
      references: [classroom.id],
    }),
    student: one(user, {
      fields: [classroomMembers.studentId],
      references: [user.id],
    }),
  }),
);
