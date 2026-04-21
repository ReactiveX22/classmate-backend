import { Injectable } from '@nestjs/common';
import { TeacherService } from 'src/user/services/teacher.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseRepository } from '../repositories/course.repository';
import { CourseFilterDto } from '../dto/course-filter.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { ERROR_CODES } from 'src/common/constants/error.codes';

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

  async getCourseById(orgId: string, id: string) {
    const course = await this.courseRepository.findByIdWithTeacher(id, orgId);

    if (!course)
      throw new ApplicationNotFoundException(
        'Course not found in organization',
      );

    return course;
  }

  async update(orgId: string, id: string, dto: UpdateCourseDto) {
    const course = await this.courseRepository.findById(id);

    if (!course) throw new ApplicationNotFoundException();

    if (orgId !== course.organizationId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    if (dto.teacherId) {
      await this.teacherService.findTeacherInOrg(dto.teacherId, orgId);
    }

    return this.courseRepository.update(id, dto);
  }

  async remove(orgId: string, id: string) {
    const course = await this.courseRepository.findById(id);

    if (!course) throw new ApplicationNotFoundException();

    if (orgId !== course.organizationId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    await this.courseRepository.remove(id);
  }

  async getAllCourses(orgId: string, query: CourseFilterDto) {
    return this.courseRepository.findAllByOrganization(orgId, query);
  }
}
