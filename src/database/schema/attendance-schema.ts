import { date, pgEnum, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroom } from './classroom-schema';
import { relations } from 'drizzle-orm';

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

export const attendanceStatus = pgEnum(
  'attendance_status',
  Object.values(ATTENDANCE_STATUS) as [string, ...string[]],
);

export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classroomId: uuid('classroom_id')
      .references(() => classroom.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: text('student_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),

    date: date('date').defaultNow().notNull(),
    status: attendanceStatus('status')
      .default(ATTENDANCE_STATUS.PRESENT)
      .notNull(),
    remarks: text('remarks'),
  },
  (table) => [
    unique('unique_daily_attendance').on(
      table.studentId,
      table.date,
      table.classroomId,
    ),
  ],
);

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(user, {
    fields: [attendance.studentId],
    references: [user.id],
  }),
}));

export type InsertAttendance = typeof attendance.$inferInsert;
