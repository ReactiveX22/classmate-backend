import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { User } from 'src/auth/auth.factory';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { buildOrganizationFilters } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  SelectTeacher,
  SelectUserProfile,
  teacher,
  user,
} from 'src/database/schema';
import { teacherPaginationConfig } from 'src/lib/pagination/config/teacher.config';
import { PaginationService } from 'src/lib/pagination/pagination.service';

@Injectable()
export class TeacherRepository {
  constructor(
    @InjectDb() private readonly db: DB,
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

  async findByIdWithUser(
    id: string,
  ): Promise<{ teacher: SelectTeacher; user: User } | null> {
    const result = await this.db
      .select()
      .from(teacher)
      .innerJoin(user, eq(teacher.userId, user.id))
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
    const filters = buildOrganizationFilters(organizationId, {
      role: AppRole.Instructor,
    });

    return this.paginationService.paginate<TeacherWithProfile>(
      {
        config: teacherPaginationConfig,
        filters,
      },
      query,
    );
  }
}

export interface TeacherWithProfile {
  teacher: SelectTeacher | null;
  userProfile: SelectUserProfile | null;
  user: User;
}
