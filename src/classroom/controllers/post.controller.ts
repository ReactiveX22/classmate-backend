import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { ListClassroomPostsDto } from '../dto/list-classroom-posts.dto';
import { VoteClassroomPollDto } from '../dto/vote-classroom-poll.dto';
import { ClassroomService } from '../services/classroom.service';

@Controller('classrooms/:classroomId/posts')
export class PostController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get()
  async findPostsByClassroom(
    @Param('classroomId', ParseUUIDPipe) id: string,
    @Query() query: ListClassroomPostsDto,
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

  @Roles([AppRole.Instructor, AppRole.Student])
  @Put(':postId/poll-vote')
  async voteOnPoll(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() body: VoteClassroomPollDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return this.classroomService.voteOnPoll(
      classroomId,
      postId,
      session.user,
      body,
      orgId,
    );
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Post(':postId/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bookmarkPost(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    await this.classroomService.bookmarkPost(
      classroomId,
      postId,
      session.user.id,
      orgId,
    );
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Delete(':postId/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbookmarkPost(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    await this.classroomService.unbookmarkPost(
      classroomId,
      postId,
      session.user.id,
      orgId,
    );
  }
}
