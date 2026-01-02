import { Injectable } from '@nestjs/common';
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
  }) {
    const newSubmission: InsertSubmission = {
      postId: data.postId,
      studentId: data.studentId,
      content: data.content,
      attachments: data.attachments,
    };

    return await this.db
      .insert(assignmentSubmission)
      .values(newSubmission)
      .returning();
  }
}
