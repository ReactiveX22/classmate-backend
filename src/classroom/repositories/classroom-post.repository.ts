import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroomPost } from 'src/database/schema';

@Injectable()
export class ClassroomPostRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(
    data: Omit<typeof classroomPost.$inferInsert, 'authorId' | 'classroomId'>,
    classroomId: string,
    authorId: string,
  ) {
    const post = await this.db
      .insert(classroomPost)
      .values({ ...data, authorId, classroomId })
      .returning();
    return post;
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

  async fetchOne(postId: string) {
    return await this.db.query.classroomPost.findFirst({
      where: eq(classroomPost.id, postId),
    });
  }
}
