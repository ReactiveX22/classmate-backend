import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const testItems = pgTable('test_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  value: integer('value').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export type TestItem = typeof testItems.$inferSelect;
export type NewTestItem = typeof testItems.$inferInsert;
