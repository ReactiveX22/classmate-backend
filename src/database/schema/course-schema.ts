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
import { user } from './auth-schema';
import { enrollment } from './enrollment-schema';
import { organization } from './organization-schema';
import { semester } from './semester-schema';
import { courseSession } from './session-schema';

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
    teacherId: text('teacher_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    sessionId: uuid('session_id').references(() => courseSession.id, {
      onDelete: 'set null',
    }),
    semesterId: uuid('semester_id').references(() => semester.id, {
      onDelete: 'set null',
    }),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    credits: integer('credits').default(3).notNull(),
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
    unique('course_code_organization_unique').on(
      table.code,
      table.organizationId,
    ),
  ],
);

export const courseRelations = relations(course, ({ one, many }) => ({
  organization: one(organization, {
    fields: [course.organizationId],
    references: [organization.id],
  }),
  teacher: one(user, {
    fields: [course.teacherId],
    references: [user.id],
  }),
  session: one(courseSession, {
    fields: [course.sessionId],
    references: [courseSession.id],
  }),
  semester: one(semester, {
    fields: [course.semesterId],
    references: [semester.id],
  }),
  enrollment: many(enrollment),
}));

export type SelectCourse = typeof course.$inferSelect;

export type CourseStatus = (typeof courseStatusEnum.enumValues)[number];
