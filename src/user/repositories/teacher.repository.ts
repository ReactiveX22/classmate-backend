import { Inject, Injectable } from '@nestjs/common';
import { count } from 'console';
import { and, eq, SQL } from 'drizzle-orm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import {
  buildOrganizationFilters,
  buildSearchConfig,
  buildSortConfig,
  drizzlePaginate,
} from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { teacher, user, userProfile } from 'src/database/schema';
import { TeacherPaginationConfig } from 'src/lib/pagination/config/teacher.config';
import {
  InjectPaginationService,
  PaginationService,
} from 'src/lib/pagination/pagination.service';

@Injectable()
export class TeacherRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    @InjectPaginationService()
    private readonly paginationService: PaginationService,
  ) {}

  async findByUserId(userId: string) {
    const result = await this.db
      .select()
      .from(teacher)
      .where(eq(teacher.userId, userId))
      .limit(1);
    return result[0] || null;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(teacher)
      .where(eq(teacher.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(data: { userId: string; title?: string; joinDate?: string }) {
    const [created] = await this.db.insert(teacher).values(data).returning();
    return created;
  }

  async update(id: string, data: Partial<typeof teacher.$inferInsert>) {
    const [updated] = await this.db
      .update(teacher)
      .set(data)
      .where(eq(teacher.id, id))
      .returning();
    return updated || null;
  }

  async findByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeacherWithProfile>> {
    const filters = buildOrganizationFilters(
      organizationId,
      AppRole.Instructor,
    );

    return this.paginationService.paginate<TeacherWithProfile>(
      {
        getBaseQuery: TeacherPaginationConfig.getBaseQuery,
        filters,
        search: this.paginationService.buildSearchConfig(
          query.search,
          TeacherPaginationConfig.searchableFields,
        ),
        sort: this.paginationService.buildSortConfig(
          TeacherPaginationConfig.sortFields,
          'createdAt',
          query.sortOrder === 'asc' ? 'asc' : 'desc',
        ),
        getCountQuery: TeacherPaginationConfig.getCountQuery,
      },
      query,
    );
  }
}

export interface TeacherWithProfile {
  student: {
    id: string;
    studentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  userProfile: {
    id: string;
    phone: string | null;
    bio: string | null;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    status: 'pending' | 'active' | 'suspended';
    createdAt: Date;
  };
}
