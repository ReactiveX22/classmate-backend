import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organization } from './organization-schema';
import { user } from './auth-schema';

export const importJobType = pgEnum('import_job_type', ['student', 'teacher']);

export const importJobStatus = pgEnum('import_job_status', [
  'draft',
  'pending',
  'validating',
  'processing',
  'partial',
  'completed',
  'failed',
]);

export interface ImportRowError {
  row: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  kind?: 'skipped' | 'failed';
}

export const importJob = pgTable(
  'import_job',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    type: importJobType('type').notNull(),
    status: importJobStatus('status').notNull().default('draft'),
    fileName: text('file_name'),
    fileKey: text('file_key').notNull(),
    errorFileKey: text('error_file_key'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    total: integer('total').notNull().default(0),
    imported: integer('imported').notNull().default(0),
    skipped: integer('skipped').notNull().default(0),
    failed: integer('failed').notNull().default(0),
    errorSummary: jsonb('error_summary')
      .$type<ImportRowError[]>()
      .default([])
      .notNull(),
    error: text('error'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('import_job_organizationId_idx').on(table.organizationId),
    index('import_job_createdById_idx').on(table.createdById),
  ],
);

export const importJobRelations = relations(importJob, ({ one }) => ({
  organization: one(organization, {
    fields: [importJob.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [importJob.createdById],
    references: [user.id],
  }),
}));

export type SelectImportJob = typeof importJob.$inferSelect;
export type InsertImportJob = typeof importJob.$inferInsert;
