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
      content: data.content,
      attachments: data.attachments,
      status: data.status,
    };

    return await this.db
      .insert(assignmentSubmission)
      .values(newSubmission)
      .returning();
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
