import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export const organization = pgTable(
  'organization',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    type: text('type'), // school, college, university, etc.
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    logo: text('logo'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('organization_slug_idx').on(table.slug)],
);

export const organizationRelations = relations(organization, ({ many }) => ({
  users: many(user),
}));
