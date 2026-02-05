import { Injectable } from '@nestjs/common';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';
import { type DB, InjectDb, Transaction } from 'src/database/db.provider';
import {
  assignmentSubmission,
  classroomMembers,
  classroomPost,
  user,
} from 'src/database/schema';

@Injectable()
export class ClassroomPostRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async runInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return await this.db.transaction(callback);
  }

  async create(
    tx: Transaction,
    data: Omit<typeof classroomPost.$inferInsert, 'authorId' | 'classroomId'>,
    classroomId: string,
    authorId: string,
  ) {
    const post = await tx
      .insert(classroomPost)
      .values({ ...data, authorId, classroomId })
      .returning();
    return post[0];
  }

  async getClassroomMembers(tx: Transaction, classroomId: string) {
    return await tx
      .select({ studentId: classroomMembers.studentId })
      .from(classroomMembers)
      .where(eq(classroomMembers.classroomId, classroomId));
  }

  async createSubmissions(
    tx: Transaction,
    postId: string,
    studentIds: string[],
  ) {
    if (studentIds.length === 0) return [];

    return await tx
      .insert(assignmentSubmission)
      .values(
        studentIds.map((studentId) => ({
          postId,
          studentId,
          status: 'assigned' as const,
        })),
      )
      .returning();
  }

  async deleteAttachment(postId: string, attachmentId: string) {
    const post = await this.db.query.classroomPost.findFirst({
      where: eq(classroomPost.id, postId),
    });

    if (!post || !post.attachments) return;

    const updatedAttachments = post.attachments.filter(
      (a) => a.id !== attachmentId,
    );

    await this.db
      .update(classroomPost)
      .set({ attachments: updatedAttachments })
      .where(eq(classroomPost.id, postId));

    return post.attachments.find((a) => a.id === attachmentId);
  }

  async deletePost(classroomId: string, postId: string) {
    await this.db
      .delete(classroomPost)
      .where(
        and(
          eq(classroomPost.classroomId, classroomId),
          eq(classroomPost.id, postId),
        ),
      );
  }

  async fetchOne(postId: string, userId?: string) {
    const selection: any = {
      ...getTableColumns(classroomPost),
      author: user,
    };

    if (userId) {
      selection.submission = assignmentSubmission;
    }

    let query = this.db
      .select(selection)
      .from(classroomPost)
      .innerJoin(user, eq(classroomPost.authorId, user.id))
      .where(eq(classroomPost.id, postId));

    if (userId) {
      query = query.leftJoin(
        assignmentSubmission,
        and(
          eq(assignmentSubmission.postId, classroomPost.id),
          eq(assignmentSubmission.studentId, userId),
        ),
      ) as any;
    }

    const [post] = await query;
    return post as any;
  }

  async update(postId: string, authorId: string, body: any) {
    const post = await this.db.query.classroomPost.findFirst({
      where: eq(classroomPost.id, postId),
    });

    if (!post || post.authorId !== authorId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this post',
      );
    }

    return await this.db
      .update(classroomPost)
      .set(body)
      .where(eq(classroomPost.id, postId))
      .returning();
  }
}
