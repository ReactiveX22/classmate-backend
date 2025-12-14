import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userProfile } from './user-profile-schema';

export const student = pgTable(
  'student',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userProfileId: uuid('user_profile_id')
      .notNull()
      .unique()
      .references(() => userProfile.id, { onDelete: 'cascade' }),
    studentId: text('student_id').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('student_id_idx').on(table.userProfileId)],
);

export const studentRelations = relations(student, ({ one }) => ({
  userProfile: one(userProfile, {
    fields: [student.userProfileId],
    references: [userProfile.id],
  }),
}));
