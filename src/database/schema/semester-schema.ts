import { relations } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { course } from './course-schema';
import { organization } from './organization-schema';

export const semester = pgTable(
  'semester',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organization.id, { onDelete: 'cascade' })
      .notNull(),
    ordinal: text('ordinal').notNull(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique('semester_ordinal_organization_unique').on(
      table.ordinal,
      table.organizationId,
    ),
    index('semester_organization_idx').on(table.organizationId),
  ],
);

export const semesterRelations = relations(semester, ({ one, many }) => ({
  organization: one(organization, {
    fields: [semester.organizationId],
    references: [organization.id],
  }),
  courses: many(course),
}));

export type SelectSemester = typeof semester.$inferSelect;
export type InsertSemester = typeof semester.$inferInsert;
