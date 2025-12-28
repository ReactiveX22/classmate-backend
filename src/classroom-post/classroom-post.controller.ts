import { Body, Controller, Post } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { type AppUserSession } from 'src/common/types/session.types';
import { ClassroomPostService } from './classroom-post.service';
import { CreateClassroomPostDto } from './dto/create-classroom-post.dto';

@Controller('posts')
export class ClassroomPostController {
  constructor(private readonly classroomPostService: ClassroomPostService) {}

  @Post()
  async create(
    @Body() body: CreateClassroomPostDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.classroomPostService.create(body, orgId, session.user.id);
  }
}
