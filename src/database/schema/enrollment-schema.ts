import { primaryKey, uuid } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { student } from './student-schema';
import { course } from './course-schema';
import { timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const enrollment = pgTable(
  'enrollment',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => student.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    enrollAt: timestamp('enroll_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.courseId] })],
);

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  course: one(course, {
    fields: [enrollment.courseId],
    references: [course.id],
  }),
  student: one(student, {
    fields: [enrollment.studentId],
    references: [student.id],
  }),
}));
