import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { relations } from 'drizzle-orm';

export const todoStatus = pgEnum('todo_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const todoPriority = pgEnum('todo_priority', ['low', 'medium', 'high']);

export const todo = pgTable('todo', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: todoStatus('status').default('pending').notNull(),
  priority: todoPriority('priority').default('medium').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const todoRelations = relations(todo, ({ one }) => ({
  user: one(user, {
    fields: [todo.userId],
    references: [user.id],
  }),
}));

export type SelectTodo = typeof todo.$inferSelect;
export type InsertTodo = typeof todo.$inferInsert;
