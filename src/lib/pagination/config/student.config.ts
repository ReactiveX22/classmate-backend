import { SQL, and, count, eq } from 'drizzle-orm';
import { type DB } from 'src/database/db.provider';
import { student, user, userProfile } from 'src/database/schema';
import { PaginatedConfig } from '../pagination.interface';

export class StudentPaginationConfig implements PaginatedConfig {
  searchableFields = [user.name, user.email, student.id, student.studentId];

  sortFields = {
    name: user.name,
    email: user.email,
    studentId: student.studentId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db
      .select()
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(student, eq(user.id, student.userId))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(student, eq(user.id, student.userId))
      .where(and(...filters));
    return total;
  }
}

export const studentPaginationConfig = new StudentPaginationConfig();
