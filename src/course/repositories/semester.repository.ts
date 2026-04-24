import { Injectable } from '@nestjs/common';
import { and, eq, type SQL } from 'drizzle-orm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { buildOrganizationFilters } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { semester, SelectSemester } from 'src/database/schema';
import { semesterPaginationConfig } from 'src/lib/pagination/config/semester.config';
import { PaginationService } from 'src/lib/pagination/pagination.service';

@Injectable()
export class SemesterRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
  ) {}

  async create(data: {
    organizationId: string;
    ordinal: string;
    name?: string;
  }) {
    const [created] = await this.db.insert(semester).values(data).returning();
    return created;
  }

  async findById(id: string): Promise<SelectSemester | null> {
    const [result] = await this.db
      .select()
      .from(semester)
      .where(eq(semester.id, id))
      .limit(1);
    return result || null;
  }

  async update(id: string, data: Partial<typeof semester.$inferInsert>) {
    const [updated] = await this.db
      .update(semester)
      .set(data)
      .where(eq(semester.id, id))
      .returning();
    return updated || null;
  }

  async remove(id: string) {
    await this.db.delete(semester).where(eq(semester.id, id));
  }

  async findAllByOrganization(
    orgId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<SelectSemester>> {
    const filters = buildOrganizationFilters(orgId, { table: semester });

    return this.paginationService.paginate<SelectSemester>(
      {
        config: semesterPaginationConfig,
        filters,
      },
      query,
    );
  }
}
