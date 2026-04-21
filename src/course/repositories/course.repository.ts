import { Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { buildOrganizationFilters } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { course, SelectCourse } from 'src/database/schema';
import { coursePaginationConfig } from 'src/lib/pagination/config/course.config';
import { PaginationService } from 'src/lib/pagination/pagination.service';
import { CourseFilterDto } from '../dto/course-filter.dto';

@Injectable()
export class CourseRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
  ) {}

  async countByOrganization(organizationId: string) {
    const [result] = await this.db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(course)
      .where(eq(course.organizationId, organizationId));
    return result?.count ?? 0;
  }

  async create(data: {
    organizationId: string;
    teacherId?: string;
    semesterId: string;
    sessionId?: string;
    code: string;
    title: string;
    description?: string;
    credits?: number;
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

  async findByIdWithTeacher(
    courseId: string,
    orgId: string,
  ): Promise<SelectCourse | null> {
    const result = await this.db.query.course.findFirst({
      where: and(eq(course.id, courseId), eq(course.organizationId, orgId)),
      with: {
        teacher: true,
        session: true,
        semester: true,
        enrollment: {
          with: {
            student: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });
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
    query: CourseFilterDto,
  ): Promise<PaginatedResponse<SelectCourse>> {
    const extraFilters: SQL[] = [];
    if (query.semesterId) extraFilters.push(eq(course.semesterId, query.semesterId));
    if (query.sessionId) extraFilters.push(eq(course.sessionId, query.sessionId));

    const filters = buildOrganizationFilters(orgId, { table: course, extraFilters });

    return this.paginationService.paginate<SelectCourse>(
      {
        config: coursePaginationConfig,
        filters,
      },
      query,
    );
  }
}
