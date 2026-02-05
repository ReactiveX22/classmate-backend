import { relations } from 'drizzle-orm';
import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { notification } from './notification-schema';

export const notificationRead = pgTable(
  'notification_read',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notification.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.userId] })],
);

export const notificationReadRelations = relations(
  notificationRead,
  ({ one }) => ({
    user: one(user, {
      fields: [notificationRead.userId],
      references: [user.id],
    }),
    notification: one(notification, {
      fields: [notificationRead.notificationId],
      references: [notification.id],
    }),
  }),
);
