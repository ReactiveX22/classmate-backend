import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type AppUserSession } from 'src/common/types/session.types';
import { ClassroomService } from '../services/classroom.service';

@Controller('classrooms/:classroomId/posts')
export class PostController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Get()
  async findPostsByClassroom(
    @Param('classroomId', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return this.classroomService.findPostsByClassroom(
      id,
      session.user,
      orgId,
      query,
    );
  }
}
