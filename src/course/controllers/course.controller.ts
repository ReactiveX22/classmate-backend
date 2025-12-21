import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseService } from '../services/course.service';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseService.getAllCourses(orgId, query);
  }

  @Post()
  @Roles([AppRole.Admin])
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseService.createCourse(createCourseDto, orgId);
  }
}
