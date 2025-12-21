import { Injectable } from '@nestjs/common';
import { TeacherService } from 'src/user/services/teacher.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseRepository } from '../repositories/course.repository';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
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

  async getAllCourses(orgId: string, query: PaginationQueryDto) {
    return this.courseRepository.findAllByOrganization(orgId, query);
  }
}
