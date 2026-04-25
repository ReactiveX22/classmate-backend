import { Injectable } from '@nestjs/common';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';
import { type DB, InjectDb, Transaction } from 'src/database/db.provider';
import {
  assignmentSubmission,
  classroomMembers,
  classroomPost,
  classroomPostComment,
  classroomResourceBookmark,
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
      isBookmarked: userId
        ? sql<boolean>`EXISTS (
            SELECT 1
            FROM ${classroomResourceBookmark}
            WHERE ${classroomResourceBookmark.postId} = ${classroomPost.id}
              AND ${classroomResourceBookmark.userId} = ${userId}
          )`.as('isBookmarked')
        : sql<boolean>`false`.as('isBookmarked'),
    };

    if (userId) {
      selection.submission = assignmentSubmission;
    }

    // Add comment data
    const commentCountSq = sql<number>`(
      SELECT COUNT(*)
      FROM ${classroomPostComment}
      WHERE ${classroomPostComment.postId} = ${classroomPost.id}
    )`.as('commentCount');

    const recentCommentsSq = sql`COALESCE(
      (
        SELECT json_agg(comment_data)
        FROM (
          SELECT 
            c.id,
            c.content,
            c."created_at",
            json_build_object(
              'id', u.id,
              'name', u.name,
              'image', u.image
            ) as author
          FROM ${classroomPostComment} c
          INNER JOIN ${user} u ON c."author_id" = u.id
          WHERE c."post_id" = ${classroomPost.id}
          ORDER BY c."created_at" DESC
          LIMIT 3
        ) comment_data
      ),
      '[]'::json
    )`.as('recentComments');

    selection.commentCount = commentCountSq;
    selection.recentComments = recentCommentsSq;

    const query = this.db
      .select(selection)
      .from(classroomPost)
      .innerJoin(user, eq(classroomPost.authorId, user.id))
      .where(eq(classroomPost.id, postId));

    if (userId) {
      query.leftJoin(
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

    const [updatedPost] = await this.db
      .update(classroomPost)
      .set(body)
      .where(eq(classroomPost.id, postId))
      .returning();

    return updatedPost;
  }

  async updateQuestionData(postId: string, questionData: any) {
    const [updatedPost] = await this.db
      .update(classroomPost)
      .set({ questionData })
      .where(eq(classroomPost.id, postId))
      .returning();

    return updatedPost;
  }

  async findUsersByIds(userIds: string[]) {
    if (userIds.length === 0) return [];

    return await this.db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(user)
      .where(inArray(user.id, userIds));
  }

  async bookmark(postId: string, userId: string) {
    await this.db
      .insert(classroomResourceBookmark)
      .values({ postId, userId })
      .onConflictDoNothing();
  }

  async unbookmark(postId: string, userId: string) {
    await this.db
      .delete(classroomResourceBookmark)
      .where(
        and(
          eq(classroomResourceBookmark.postId, postId),
          eq(classroomResourceBookmark.userId, userId),
        ),
      );
  }
}
