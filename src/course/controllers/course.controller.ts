import { Controller, Get } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { CourseService } from '../services/course.service';
import { AppRole } from 'src/common/enums/role.enum';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @Roles([AppRole.Admin])
  async findAll() {
    return this.courseService.findAllCourses();
  }
}
