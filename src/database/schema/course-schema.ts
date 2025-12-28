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
import { enrollment } from './enrollment-schema';
import { Many } from 'drizzle-orm';

export const courseStatusEnum = pgEnum('course_status', [
  'active',
  'inactive',
  'archived',
]);

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
    status: courseStatusEnum('status').default('active').notNull(),
    maxStudents: integer('max_students').default(50).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('course_code_semester_unique').on(table.code, table.semester),
  ],
);

export const courseRelations = relations(course, ({ one, many }) => ({
  organization: one(organization, {
    fields: [course.organizationId],
    references: [organization.id],
  }),
  teacher: one(teacher, {
    fields: [course.teacherId],
    references: [teacher.id],
  }),
  enrollment: many(enrollment),
}));

export type SelectCourse = typeof course.$inferSelect;

export type CourseStatus = (typeof courseStatusEnum.enumValues)[number];
