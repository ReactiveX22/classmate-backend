import { relations } from 'drizzle-orm';
import { date, index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { userProfile } from './user-profile-schema';
import { course } from './course-schema';

export const teacherTitleEnum = pgEnum('teacher_title', [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Instructor',
]);

export const teacher = pgTable(
  'teacher',
  {
    id: text('id').primaryKey(),
    userProfileId: text('user_profile_id')
      .notNull()
      .unique()
      .references(() => userProfile.id, { onDelete: 'cascade' }),
    title: teacherTitleEnum('title').notNull(),
    joinDate: date('join_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('teacher_id_idx').on(table.id)],
);

export const teacherRelations = relations(teacher, ({ one, many }) => ({
  userProfile: one(userProfile, {
    fields: [teacher.userProfileId],
    references: [userProfile.id],
  }),
  courses: many(course),
}));

