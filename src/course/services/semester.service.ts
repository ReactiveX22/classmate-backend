import { Injectable } from '@nestjs/common';
import { CreateSemesterDto } from '../dto/create-semester.dto';
import { UpdateSemesterDto } from '../dto/update-semester.dto';
import { SemesterRepository } from '../repositories/semester.repository';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { ERROR_CODES } from 'src/common/constants/error.codes';

@Injectable()
export class SemesterService {
  constructor(private readonly semesterRepository: SemesterRepository) {}

  async create(data: CreateSemesterDto, orgId: string) {
    return this.semesterRepository.create({ ...data, organizationId: orgId });
  }

  async findById(orgId: string, id: string) {
    const semester = await this.semesterRepository.findById(id);

    if (!semester) throw new ApplicationNotFoundException('Semester not found');

    if (semester.organizationId !== orgId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    return semester;
  }

  async update(orgId: string, id: string, dto: UpdateSemesterDto) {
    await this.findById(orgId, id);
    return this.semesterRepository.update(id, dto);
  }

  async remove(orgId: string, id: string) {
    await this.findById(orgId, id);
    await this.semesterRepository.remove(id);
  }

  async getAll(orgId: string, query: PaginationQueryDto) {
    return this.semesterRepository.findAllByOrganization(orgId, query);
  }
}
