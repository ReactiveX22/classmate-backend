import { relations } from 'drizzle-orm';
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { aiConversation } from './ai-conversation-schema';
import { user } from './auth-schema';
import { organization } from './organization-schema';

export const aiMessageRole = pgEnum('ai_message_role', [
  'user',
  'assistant',
  'system',
  'tool',
]);

export const aiMessage = pgTable('ai_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .references(() => aiConversation.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: uuid('organization_id').references(() => organization.id, {
    onDelete: 'cascade',
  }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  role: aiMessageRole('role').notNull(),
  content: text('content').notNull(),
  provider: text('provider'),
  model: text('model'),
  tokenUsage: jsonb('token_usage').$type<Record<string, unknown>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiMessageRelations = relations(aiMessage, ({ one }) => ({
  conversation: one(aiConversation, {
    fields: [aiMessage.conversationId],
    references: [aiConversation.id],
  }),
  organization: one(organization, {
    fields: [aiMessage.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [aiMessage.userId],
    references: [user.id],
  }),
}));

export type InsertAiMessage = typeof aiMessage.$inferInsert;
export type SelectAiMessage = typeof aiMessage.$inferSelect;
