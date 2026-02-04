import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema';
import { organization } from './organization-schema';

export const notification = pgTable('notification', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organization.id, {
    onDelete: 'cascade',
  }),
  title: text('title').notNull(),
  content: text('content'),
  type: text('type').notNull(),
  recipientId: text('recipient_id'),
  actorId: text('actor_id'),
  entityId: text('entity_id'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.recipientId],
    references: [user.id],
  }),
  actor: one(user, {
    fields: [notification.actorId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [notification.organizationId],
    references: [organization.id],
  }),
}));

export type InsertNotification = typeof notification.$inferInsert;
export type AppNotification = typeof notification.$inferSelect;
