import { relations } from 'drizzle-orm';
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { aiMessage } from './ai-message-schema';
import { user } from './auth-schema';
import { classroom } from './classroom-schema';
import { organization } from './organization-schema';

export const aiConversationStatus = pgEnum('ai_conversation_status', [
  'active',
  'archived',
]);

export const aiConversation = pgTable('ai_conversation', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organization.id, {
    onDelete: 'cascade',
  }),
  userId: text('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  classroomId: uuid('classroom_id').references(() => classroom.id, {
    onDelete: 'set null',
  }),
  title: text('title'),
  status: aiConversationStatus('status').default('active').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const aiConversationRelations = relations(
  aiConversation,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [aiConversation.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [aiConversation.userId],
      references: [user.id],
    }),
    classroom: one(classroom, {
      fields: [aiConversation.classroomId],
      references: [classroom.id],
    }),
    messages: many(aiMessage),
  }),
);

export type InsertAiConversation = typeof aiConversation.$inferInsert;
export type SelectAiConversation = typeof aiConversation.$inferSelect;
