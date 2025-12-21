import { Injectable } from '@nestjs/common';
import { TeacherService } from 'src/user/services/teacher.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseRepository } from '../repositories/course.repository';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly teacherService: TeacherService,
  ) {}

  async createCourse(data: CreateCourseDto, orgId: string) {
    if (data.teacherId) {
      await this.teacherService.findTeacherInOrg(data.teacherId, orgId);
    }

    return this.courseRepository.create({ ...data, organizationId: orgId });
  }

  async getAllCourses(orgId: string, query: PaginationQueryDto) {
    return this.courseRepository.findAllByOrganization(orgId, query);
  }
}
