import { InferSelectModel, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export interface Achievement {
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export const userProfile = pgTable(
  'user_profile',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    phone: text('phone'),
    bio: text('bio'),
    skills: text('skills').array().notNull().default([]),
    achievements: jsonb('achievements')
      .$type<Achievement[]>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('user_profile_userId_idx').on(table.userId)],
);

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export type SelectUserProfile = typeof userProfile.$inferSelect;
