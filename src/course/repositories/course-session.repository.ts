import { Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { buildOrganizationFilters } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { courseSession, SelectCourseSession } from 'src/database/schema';
import { courseSessionPaginationConfig } from 'src/lib/pagination/config/course-session.config';
import { PaginationService } from 'src/lib/pagination/pagination.service';

@Injectable()
export class CourseSessionRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
  ) {}

  async create(data: {
    organizationId: string;
    name: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    isCurrent?: boolean;
  }) {
    const [created] = await this.db
      .insert(courseSession)
      .values({
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      })
      .returning();
    return created;
  }

  async findById(id: string): Promise<SelectCourseSession | null> {
    const [result] = await this.db
      .select()
      .from(courseSession)
      .where(eq(courseSession.id, id))
      .limit(1);
    return result || null;
  }

  async update(id: string, data: Partial<typeof courseSession.$inferInsert>) {
    const [updated] = await this.db
      .update(courseSession)
      .set(data)
      .where(eq(courseSession.id, id))
      .returning();
    return updated || null;
  }

  async remove(id: string) {
    await this.db.delete(courseSession).where(eq(courseSession.id, id));
  }

  async unsetOtherCurrentSessions(orgId: string, excludeId?: string) {
    await this.db
      .update(courseSession)
      .set({ isCurrent: false })
      .where(
        and(
          eq(courseSession.organizationId, orgId),
          excludeId ? ne(courseSession.id, excludeId) : undefined,
          eq(courseSession.isCurrent, true),
        ),
      );
  }

  async findAllByOrganization(
    orgId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<SelectCourseSession>> {
    const filters = buildOrganizationFilters(orgId, { table: courseSession });

    return this.paginationService.paginate<SelectCourseSession>(
      {
        config: courseSessionPaginationConfig,
        filters,
      },
      query,
    );
  }
}
