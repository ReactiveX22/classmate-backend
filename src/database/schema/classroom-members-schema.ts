import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { classroom } from './classroom-schema';
import { student } from './student-schema';

export const classroomMembers = pgTable(
  'classroom_members',
  {
    classroomId: uuid('classroom_id')
      .notNull()
      .references(() => classroom.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => student.id, { onDelete: 'cascade' }),

    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.studentId] })],
);
