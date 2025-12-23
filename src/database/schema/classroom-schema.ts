import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { course } from './course-schema';
import { teacher } from './teacher-schema';
import { relations } from 'drizzle-orm';
import { classroomMembers } from './classroom-members-schema';

export const classroomStatus = pgEnum('classroom_status', [
  'active',
  'inactive',
]);

export const classroom = pgTable('classroom', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .references(() => course.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: uuid('teacher_id')
    .references(() => teacher.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  section: text('section'),
  classCode: text('class_code').unique(),
  description: text('description'),
  status: classroomStatus('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const classroomRelations = relations(classroom, ({ one, many }) => ({
  course: one(course, {
    fields: [classroom.courseId],
    references: [course.id],
  }),
  teacher: one(teacher, {
    fields: [classroom.teacherId],
    references: [teacher.id],
  }),
  classroomMembers: many(classroomMembers),
}));
