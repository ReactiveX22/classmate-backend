import { relations } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { teacher } from './teacher-schema';

export const course = pgTable(
  'course',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id').references(() => teacher.id, {
      onDelete: 'set null',
    }),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    credits: integer('credits').default(3).notNull(),
    semester: text('semester').notNull(),
    maxStudents: integer('max_students').default(50).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('course_code_semester_unique').on(table.code, table.semester),
  ],
);

export const courseRelations = relations(course, ({ one }) => ({
  teacher: one(teacher, {
    fields: [course.teacherId],
    references: [teacher.id],
  }),
}));
