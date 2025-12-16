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
import { organization } from './organization-schema';
import { teacher } from './teacher-schema';

export const course = pgTable(
  'course',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organization.id, {
        onDelete: 'cascade',
      })
      .notNull(),
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
  organization: one(organization, {
    fields: [course.organizationId],
    references: [organization.id],
  }),
  teacher: one(teacher, {
    fields: [course.teacherId],
    references: [teacher.id],
  }),
}));
