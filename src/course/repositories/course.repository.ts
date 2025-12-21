import { Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { buildOrganizationFilters } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { course, SelectCourse } from 'src/database/schema';
import { coursePaginationConfig } from 'src/lib/pagination/config/course.config';
import {
  InjectPaginationService,
  PaginationService,
} from 'src/lib/pagination/pagination.service';

@Injectable()
export class CourseRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    @InjectPaginationService()
    private readonly paginationService: PaginationService,
  ) {}

  async create(data: {
    organizationId: string;
    teacherId?: string;
    code: string;
    title: string;
    description?: string;
    credits?: number;
    semester: string;
    maxStudents?: number;
  }) {
    const [created] = await this.db.insert(course).values(data).returning();
    return created;
  }

  async findAllByOrganization(
    orgId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<SelectCourse>> {
    const filters = buildOrganizationFilters(orgId, { table: course });

    return this.paginationService.paginate<SelectCourse>(
      {
        config: coursePaginationConfig,
        filters,
      },
      query,
    );
  }
}
