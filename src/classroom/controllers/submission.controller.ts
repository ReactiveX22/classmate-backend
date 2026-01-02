import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateSubmissionDto } from '../dto/create-assignment-submission.dto';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { type AppUserSession } from 'src/common/types/session.types';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
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
}
