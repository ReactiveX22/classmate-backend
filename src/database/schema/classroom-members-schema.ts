import {
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

    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.studentId] })],
);
