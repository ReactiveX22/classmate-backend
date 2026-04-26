import { Injectable } from '@nestjs/common';
import { CreateCourseSessionDto } from '../dto/create-course-session.dto';
import { UpdateCourseSessionDto } from '../dto/update-course-session.dto';
import { CourseSessionRepository } from '../repositories/course-session.repository';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { ERROR_CODES } from 'src/common/constants/error.codes';

@Injectable()
export class CourseSessionService {
  constructor(
    private readonly courseSessionRepository: CourseSessionRepository,
  ) {}

  async create(data: CreateCourseSessionDto, orgId: string) {
    if (data.isCurrent) {
      await this.courseSessionRepository.unsetOtherCurrentSessions(orgId);
    }

    return this.courseSessionRepository.create({
      ...data,
      organizationId: orgId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  }

  async findById(orgId: string, id: string) {
    const session = await this.courseSessionRepository.findById(id);

    if (!session) throw new ApplicationNotFoundException('Session not found');

    if (session.organizationId !== orgId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    return session;
  }

  async update(orgId: string, id: string, dto: UpdateCourseSessionDto) {
    await this.findById(orgId, id);

    if (dto.isCurrent) {
      await this.courseSessionRepository.unsetOtherCurrentSessions(orgId, id);
    }

    return this.courseSessionRepository.update(id, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  async remove(orgId: string, id: string) {
    await this.findById(orgId, id);
    await this.courseSessionRepository.remove(id);
  }

  async getAll(orgId: string, query: PaginationQueryDto) {
    return this.courseSessionRepository.findAllByOrganization(orgId, query);
  }
}
