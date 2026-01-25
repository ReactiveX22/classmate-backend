import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { Attachment } from './types';
import { relations } from 'drizzle-orm';
import { organization } from './organization-schema';

export const notice = pgTable('notice', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organization.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  content: text('content'),
  tags: text('tags').array().default([]),
  attachments: jsonb('attachments').$type<Attachment[]>().default([]),
  authorId: text('author_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const noticeRelations = relations(notice, ({ one }) => ({
  author: one(user, {
    fields: [notice.authorId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [notice.organizationId],
    references: [organization.id],
  }),
}));

export type InsertNotice = typeof notice.$inferInsert;
export type SelectNotice = typeof notice.$inferSelect;
