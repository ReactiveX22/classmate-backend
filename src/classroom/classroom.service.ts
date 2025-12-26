import { Injectable } from '@nestjs/common';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { ClassroomRepository } from './classroom.repository';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { customAlphabet } from 'nanoid';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ClassroomService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly classroomRepository: ClassroomRepository,
  ) {}

  async findAll(query: PaginationQueryDto, orgId: string) {
    return await this.classroomRepository.findAll(query, orgId);
  }

  async create(dto: CreateClassroomDto, userId: string, orgId: string) {
    const course = await this.courseRepository.findById(dto.courseId);
    if (!course) {
      throw new ApplicationNotFoundException('Course not found');
    }
    if (course.organizationId !== orgId) {
      throw new ApplicationForbiddenException(
        'Course does not belong to your organization',
      );
    }

    // TODO: check if user is assigned to this course

    const classCode = this.generateClassCode();

    return await this.classroomRepository.create({
      ...dto,
      teacherId: userId,
      classCode,
    });
  }

  private generateClassCode(): string {
    const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
    return customAlphabet(alphabet, 7)();
  }
}
