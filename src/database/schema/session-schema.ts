import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { organization } from './organization-schema';
import { course } from './course-schema';

export const courseSession = pgTable(
  'course_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    isCurrent: boolean('is_current').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('course_session_name_organization_unique').on(
      table.name,
      table.organizationId,
    ),
    index('course_session_organization_idx').on(table.organizationId),
  ],
);

export const courseSessionRelations = relations(
  courseSession,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [courseSession.organizationId],
      references: [organization.id],
    }),
    courses: many(course),
  }),
);

export type SelectCourseSession = typeof courseSession.$inferSelect;
export type InsertCourseSession = typeof courseSession.$inferInsert;
