import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateSubmissionDto } from '../dto/create-assignment-submission.dto';
import { SubmissionService } from '../services/submission.service';

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

  @Get()
  async getSubmission(
    @Session() session: AppUserSession,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return await this.submissionService.fetch(session.user.id, postId);
  }
}
