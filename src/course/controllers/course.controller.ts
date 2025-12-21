import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseService } from '../services/course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles([AppRole.Admin])
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseService.createCourse(createCourseDto, orgId);
  }
}
