import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  assignmentSubmission,
  Attachment,
  InsertSubmission,
} from 'src/database/schema';

@Injectable()
export class SubmissionRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: {
    postId: string;
    studentId: string;
    content?: string;
    attachments?: Attachment[];
    status?: InsertSubmission['status'];
  }) {
    const newSubmission: InsertSubmission = {
      postId: data.postId,
      studentId: data.studentId,
      content: data.content, // Allow updating content
      attachments: data.attachments, // Allow updating attachments
      status: data.status,
    };

    return await this.db
      .insert(assignmentSubmission)
      .values(newSubmission)
      .onConflictDoUpdate({
        target: [assignmentSubmission.postId, assignmentSubmission.studentId],
        set: {
          content: newSubmission.content,
          attachments: newSubmission.attachments,
          status: newSubmission.status,
          updatedAt: new Date(),
          submittedAt: new Date(), // Update submittedAt on re-submission
        },
      })
      .returning();
  }

  async updateStatus(
    userId: string,
    postId: string,
    status: InsertSubmission['status'],
  ) {
    return await this.db
      .update(assignmentSubmission)
      .set({ status })
      .where(
        and(
          eq(assignmentSubmission.studentId, userId),
          eq(assignmentSubmission.postId, postId),
        ),
      )
      .returning();
  }

  async deleteAttachment(userId: string, postId: string, attachmentId: string) {
    const submission = await this.fetchOneByUser(userId, postId);

    if (!submission || !submission.attachments) return null;

    const updatedAttachments = submission.attachments.filter(
      (a) => a.id !== attachmentId,
    );

    await this.db
      .update(assignmentSubmission)
      .set({ attachments: updatedAttachments })
      .where(
        and(
          eq(assignmentSubmission.studentId, userId),
          eq(assignmentSubmission.postId, postId),
        ),
      );

    return submission.attachments.find((a) => a.id === attachmentId);
  }

  async fetchOneByUser(userId: string, postId: string) {
    const results = await this.db
      .select()
      .from(assignmentSubmission)
      .where(
        and(
          eq(assignmentSubmission.studentId, userId),
          eq(assignmentSubmission.postId, postId),
        ),
      )
      .limit(1);

    return results[0] ?? null;
  }
}
