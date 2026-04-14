import { Injectable } from '@nestjs/common';
import { eq, getTableColumns } from 'drizzle-orm';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroomPost, classroomPostComment, user } from 'src/database/schema';

@Injectable()
export class ClassroomPostCommentRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(postId: string, authorId: string, content: string) {
    const [comment] = await this.db
      .insert(classroomPostComment)
      .values({ postId, authorId, content })
      .returning();
    return comment;
  }

  async findById(commentId: string) {
    return await this.db.query.classroomPostComment.findFirst({
      where: eq(classroomPostComment.id, commentId),
    });
  }

  async findByPostId(postId: string) {
    const columns = {
      ...getTableColumns(classroomPostComment),
      author: user,
    };

    return await this.db
      .select(columns)
      .from(classroomPostComment)
      .innerJoin(user, eq(classroomPostComment.authorId, user.id))
      .where(eq(classroomPostComment.postId, postId))
      .orderBy(classroomPostComment.createdAt);
  }

  async update(commentId: string, authorId: string, content: string) {
    const comment = await this.findById(commentId);

    if (!comment) {
      throw new ApplicationNotFoundException('Comment not found');
    }

    if (comment.authorId !== authorId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this comment',
      );
    }

    const [updated] = await this.db
      .update(classroomPostComment)
      .set({ content })
      .where(eq(classroomPostComment.id, commentId))
      .returning();

    return updated;
  }

  async delete(commentId: string, authorId: string) {
    const comment = await this.findById(commentId);

    if (!comment) {
      throw new ApplicationNotFoundException('Comment not found');
    }

    if (comment.authorId !== authorId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to delete this comment',
      );
    }

    await this.db
      .delete(classroomPostComment)
      .where(eq(classroomPostComment.id, commentId));
  }

  async verifyPostCommentsEnabled(postId: string): Promise<boolean> {
    const post = await this.db.query.classroomPost.findFirst({
      where: eq(classroomPost.id, postId),
      columns: { commentsEnabled: true },
    });

    return post?.commentsEnabled ?? false;
  }
}
