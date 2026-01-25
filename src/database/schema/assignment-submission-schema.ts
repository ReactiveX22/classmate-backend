import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';
import { Attachment, classroomPost } from './classroom-post-schema';

export const SUBMISSION_STATUS = {
  ASSIGNED: 'assigned',
  TURNED_IN: 'turned_in',
  GRADED: 'graded',
  RETURNED: 'returned',
} as const;

export const submissionStatus = pgEnum(
  'submission_status',
  Object.values(SUBMISSION_STATUS) as [string, ...string[]],
);

export const assignmentSubmission = pgTable(
  'assignment_submission',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .references(() => classroomPost.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: text('student_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),

    content: text('content'),
    attachments: jsonb('attachments').$type<Attachment[]>().default([]),
    status: submissionStatus('status').default('assigned').notNull(),

    grade: integer('grade'),
    feedback: text('feedback'),
    gradedById: text('graded_by_id').references(() => user.id),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique('student_post_unique_idx').on(table.studentId, table.postId),
  ],
);

export const assignmentSubmissionRelations = relations(
  assignmentSubmission,
  ({ one }) => ({
    post: one(classroomPost, {
      fields: [assignmentSubmission.postId],
      references: [classroomPost.id],
    }),
    student: one(user, {
      fields: [assignmentSubmission.studentId],
      references: [user.id],
    }),
    grader: one(user, {
      fields: [assignmentSubmission.gradedById],
      references: [user.id],
    }),
  }),
);

export type SelectSubmission = typeof assignmentSubmission.$inferSelect;
export type InsertSubmission = typeof assignmentSubmission.$inferInsert;
export type SubmissionStatus =
  (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];
