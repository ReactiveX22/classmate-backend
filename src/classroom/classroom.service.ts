import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { ClassroomRepository } from './classroom.repository';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { AddMembersClassroomDto } from './dto/addMembers-classroom.dto';

@Injectable()
export class ClassroomService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly classroomRepository: ClassroomRepository,
  ) {}

  async findAll(query: PaginationQueryDto, orgId: string) {
    return await this.classroomRepository.findAll(query, orgId);
  }

  async findOne(id: string, orgId: string) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom || classroom.course.organizationId !== orgId) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    return classroom;
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

  async update(
    id: string,
    userId: string,
    orgId: string,
    dto: UpdateClassroomDto,
  ) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this classroom',
      );
    }

    return await this.classroomRepository.update(id, dto);
  }

  async addMembers(
    id: string,
    userId: string,
    orgId: string,
    dto: AddMembersClassroomDto,
  ) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this classroom',
      );
    }

    return await this.classroomRepository.addMembers(id, dto.studentIds);
  }

  async removeMembers(
    id: string,
    userId: string,
    orgId: string,
    dto: AddMembersClassroomDto,
  ) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this classroom',
      );
    }

    await this.classroomRepository.removeMembers(id, dto.studentIds);
  }

  private generateClassCode(): string {
    const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
    return customAlphabet(alphabet, 7)();
  }
}
