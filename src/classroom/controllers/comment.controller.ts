import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { Roles } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateClassroomPostCommentDto } from '../dto/create-classroom-post-comment.dto';
import { UpdateClassroomPostCommentDto } from '../dto/update-classroom-post-comment.dto';
import { ClassroomPostCommentService } from '../services/comment.service';

@Controller('classrooms/:classroomId/posts/:postId/comments')
export class CommentController {
  constructor(private readonly commentService: ClassroomPostCommentService) {}

  @Get()
  @Roles([AppRole.Instructor, AppRole.Student])
  async getComments(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @OrganizationId() orgId: string,
  ) {
    return this.commentService.getCommentsByPost(classroomId, postId, orgId);
  }

  @Post()
  @Roles([AppRole.Instructor, AppRole.Student])
  async createComment(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateClassroomPostCommentDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return this.commentService.createComment(
      classroomId,
      postId,
      session.user,
      dto,
      orgId,
    );
  }

  @Patch(':commentId')
  @Roles([AppRole.Instructor, AppRole.Student])
  async updateComment(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateClassroomPostCommentDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return this.commentService.updateComment(
      classroomId,
      commentId,
      session.user.id,
      dto,
      orgId,
    );
  }

  @Delete(':commentId')
  @Roles([AppRole.Instructor, AppRole.Student])
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    await this.commentService.deleteComment(
      classroomId,
      commentId,
      session.user.id,
      orgId,
    );
  }
}
