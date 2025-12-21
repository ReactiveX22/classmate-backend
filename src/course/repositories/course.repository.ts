import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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

  async findById(id: string): Promise<SelectCourse | null> {
    const [result] = await this.db
      .select()
      .from(course)
      .where(eq(course.id, id))
      .limit(1);
    return result || null;
  }

  async update(id: string, data: Partial<typeof course.$inferInsert>) {
    const [updated] = await this.db
      .update(course)
      .set(data)
      .where(eq(course.id, id))
      .returning();
    return updated || null;
  }

  async remove(id: string) {
    await this.db.delete(course).where(eq(course.id, id));
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
