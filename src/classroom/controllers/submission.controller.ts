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
  Query,
} from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateSubmissionDto } from '../dto/create-assignment-submission.dto';
import { SubmissionService } from '../services/submission.service';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';

@Controller('classrooms/:classroomId/posts/:postId/submissions')
export class SubmissionsController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Roles([AppRole.Student])
  @Post()
  async submit(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateSubmissionDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return await this.submissionService.submit(
      classroomId,
      postId,
      session.user.id,
      orgId,
      dto,
    );
  }

  @Roles([AppRole.Instructor])
  @Get()
  async getAllSubmissions(
    @Query() query: PaginationQueryDto,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return await this.submissionService.fetchAll(postId, query);
  }

  @Patch('unsubmit')
  async unsubmit(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.submissionService.unsubmit(postId, session.user.id);
  }

  @Roles([AppRole.Instructor])
  @Patch('/students/:studentId/grade')
  async grade(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('studentId') studentId: string,
    @Body() body: GradeSubmissionDto,
    @Session() session: AppUserSession,
  ) {
    return await this.submissionService.grade(
      postId,
      studentId,
      session.user.id,
      body,
    );
  }

  @Delete('upload/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('attachmentId') attachmentId: string,
    @Session() session: AppUserSession,
  ) {
    await this.submissionService.deleteAttachment(
      classroomId,
      postId,
      session.user.id,
      attachmentId,
    );
  }
}
