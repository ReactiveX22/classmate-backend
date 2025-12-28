import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ClassroomPostService } from './classroom-post.service';
import { OrganizationId } from 'src/common/decorators';
import { CreateClassroomPostDto } from './dto/create-classroom-post.dto';
import { Session } from '@thallesp/nestjs-better-auth';
import { type AppUserSession } from 'src/common/types/session.types';

@Controller('posts')
export class ClassroomPostController {
  constructor(private readonly classroomPostService: ClassroomPostService) {}

  @Get()
  async findAllByClass(@OrganizationId() orgId: string) {
    return {
      orgId,
    };
  }

  @Post()
  async create(
    @Body() body: CreateClassroomPostDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.classroomPostService.create(body, orgId, session.user.id);
  }
}
