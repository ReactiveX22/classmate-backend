import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, or, asc, desc, SQL } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { student, userProfile, user } from 'src/database/schema';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { calculateOffset } from 'src/common/helpers/pagination.helper';

/**
 * Student data returned from queries.
 */
export interface StudentWithProfile {
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

@Injectable()
export class StudentRepository {
  constructor(@InjectDb() private readonly db: DB) {}

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

  async createWithUser<T>(
    studentData: { studentId?: string },
    // A callback that runs inside the transaction to create the auth user
    createAuthUser: (tx: any) => Promise<T>,
  ) {
    return await this.db.transaction(async (tx) => {
      // 1. Execute the auth creation callback within this transaction
      const authResult = await createAuthUser(tx);

      // Extract the user id (assuming the callback returns { user: { id } })
      const userId = (authResult as any).user.id;

      // 2. Create the student record
      const newStudent = await tx
        .insert(student)
        .values({
          userId: userId,
          studentId: studentData.studentId,
        })
        .returning();

      return {
        ...authResult,
        student: newStudent[0],
      };
    });
  }

  async findByUserId(userId: string) {
    const result = await this.db.query.student.findFirst({
      where: eq(student.userId, userId),
    });

    return result;
  }

  /**
   * Find students by organization with pagination, search, and sorting.
   */
  async findByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<{ students: StudentWithProfile[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = calculateOffset(page, limit);
    const sortOrder = query.sortOrder === 'desc' ? desc : asc;

    // Build where conditions - filter by org and role on user table
    const conditions: SQL[] = [
      eq(user.organizationId, organizationId),
      eq(user.role, 'student'),
    ];

    // Add search condition if provided
    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(ilike(user.name, searchPattern), ilike(user.email, searchPattern))!,
      );
    }

    const whereClause = and(...conditions);

    // Get total count - query from user table
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(student, eq(userProfile.userId, student.userId))
      .where(whereClause);

    // Determine sort column
    let orderByColumn: SQL;
    switch (query.sortBy) {
      case 'name':
        orderByColumn = sortOrder(user.name);
        break;
      case 'email':
        orderByColumn = sortOrder(user.email);
        break;
      case 'studentId':
        orderByColumn = sortOrder(student.studentId);
        break;
      case 'createdAt':
      default:
        orderByColumn = sortOrder(user.createdAt);
        break;
    }

    // Get paginated results - query from user table with LEFT JOINs
    const results = await this.db
      .select({
        student: {
          id: student.id,
          studentId: student.studentId,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
        userProfile: {
          id: userProfile.id,
          phone: userProfile.phone,
          bio: userProfile.bio,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
        },
      })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(student, eq(userProfile.userId, student.userId))
      .where(whereClause)
      .orderBy(orderByColumn)
      .limit(limit)
      .offset(offset);

    return {
      // TODO: Fix this
      students: results,
      total,
    };
  }
}
