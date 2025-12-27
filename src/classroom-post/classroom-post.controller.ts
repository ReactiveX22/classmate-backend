import { Controller, Get, Param } from '@nestjs/common';
import { ClassroomPostService } from './classroom-post.service';
import { OrganizationId } from 'src/common/decorators';

@Controller('posts')
export class ClassroomPostController {
  constructor(private readonly classroomPostService: ClassroomPostService) {}

  @Get()
  async findAllByClass(@OrganizationId() orgId: string) {
    return {
      orgId,
    };
  }
}
