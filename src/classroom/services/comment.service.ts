import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import { CreateClassroomPostCommentDto } from 'src/classroom/dto/create-classroom-post-comment.dto';
import { UpdateClassroomPostCommentDto } from 'src/classroom/dto/update-classroom-post-comment.dto';
import { ClassroomService } from 'src/classroom/services/classroom.service';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';
import { ClassroomPostCommentRepository } from '../repositories/classroom-post-comment.repository';

@Injectable()
export class ClassroomPostCommentService {
  constructor(
    private readonly classroomService: ClassroomService,
    private readonly commentRepository: ClassroomPostCommentRepository,
  ) {}

  async createComment(
    classroomId: string,
    postId: string,
    user: User,
    dto: CreateClassroomPostCommentDto,
    orgId: string,
  ) {
    await this.classroomService.findOne(classroomId, orgId);

    const commentsEnabled =
      await this.commentRepository.verifyPostCommentsEnabled(postId);
    if (!commentsEnabled) {
      throw new ApplicationForbiddenException(
        'Comments are disabled for this post',
      );
    }

    return await this.commentRepository.create(postId, user.id, dto.content);
  }

  async getCommentsByPost(
    classroomId: string,
    postId: string,
    orgId: string,
  ): Promise<any[]> {
    await this.classroomService.findOne(classroomId, orgId);

    await this.classroomService.findPost(classroomId, orgId, postId, '');

    const comments = await this.commentRepository.findByPostId(postId);
    return comments;
  }

  async updateComment(
    classroomId: string,
    commentId: string,
    userId: string,
    dto: UpdateClassroomPostCommentDto,
    orgId: string,
  ) {
    await this.classroomService.findOne(classroomId, orgId);

    return await this.commentRepository.update(commentId, userId, dto.content!);
  }

  async deleteComment(
    classroomId: string,
    commentId: string,
    userId: string,
    orgId: string,
  ) {
    await this.classroomService.findOne(classroomId, orgId);

    await this.commentRepository.delete(commentId, userId);
  }
}
