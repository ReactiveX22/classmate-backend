import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { classroomMembers } from './classroom-members-schema';
import { course } from './course-schema';
import { classroomPost } from './classroom-post-schema';

export const classroomStatus = pgEnum('classroom_status', [
  'active',
  'inactive',
]);

export const classroom = pgTable('classroom', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .references(() => course.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: text('teacher_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  section: text('section'),
  classCode: text('class_code').unique(),
  description: text('description'),
  status: classroomStatus('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const classroomRelations = relations(classroom, ({ one, many }) => ({
  course: one(course, {
    fields: [classroom.courseId],
    references: [course.id],
  }),
  teacher: one(user, {
    fields: [classroom.teacherId],
    references: [user.id],
  }),
  classroomMembers: many(classroomMembers),
  posts: many(classroomPost),
}));

export type SelectClassroom = typeof classroom.$inferSelect;
