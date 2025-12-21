import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  student,
  user,
  userProfile,
  SelectStudent,
  SelectUserProfile,
} from 'src/database/schema';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { buildOrganizationFilters } from 'src/common/helpers/pagination.helper';
import {
  InjectPaginationService,
  PaginationService,
} from 'src/lib/pagination/pagination.service';
import { studentPaginationConfig } from 'src/lib/pagination/config/student.config';
import { User } from 'src/auth/auth.factory';

/**
 * Student data returned from queries.
 */
export interface StudentWithProfile {
  student: SelectStudent | null;
  userProfile: SelectUserProfile | null;
  user: User;
}

@Injectable()
export class StudentRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    @InjectPaginationService()
    private readonly paginationService: PaginationService,
  ) {}

  async create(data: { userId: string; studentId?: string }) {
    const newStudent = await this.db
      .insert(student)
      .values({
        userId: data.userId,
        studentId: data.studentId,
      })
      .returning();

    return newStudent[0];
  }

  async findByIdWithUser(
    id: string,
  ): Promise<{ student: SelectStudent; user: User } | null> {
    const result = await this.db
      .select()
      .from(student)
      .innerJoin(user, eq(student.userId, user.id))
      .where(eq(student.id, id))
      .limit(1);

    return result[0] || null;
  }

  async update(id: string, data: Partial<typeof student.$inferInsert>) {
    const [updated] = await this.db
      .update(student)
      .set(data)
      .where(eq(student.id, id))
      .returning();
    return updated || null;
  }

  async findByUserId(userId: string) {
    const result = await this.db.query.student.findFirst({
      where: eq(student.userId, userId),
    });

    return result;
  }

  async findByUserProfileId(userProfileId: string) {
    const result = await this.db
      .select()
      .from(student)
      .innerJoin(userProfile, eq(student.userId, userProfile.userId))
      .where(eq(userProfile.id, userProfileId))
      .limit(1);

    return result[0]?.student || null;
  }

  /**
   * Find students by organization with pagination, search, and sorting.
   */
  async findByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<StudentWithProfile>> {
    const filters = buildOrganizationFilters(organizationId, {
      role: 'student',
    });

    return this.paginationService.paginate<StudentWithProfile>(
      {
        config: studentPaginationConfig,
        filters,
      },
      query,
    );
  }
}
