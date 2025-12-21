import { SQL, and, count, eq } from 'drizzle-orm';
import { type DB } from 'src/database/db.provider';
import { teacher, user, userProfile } from 'src/database/schema';
import { PaginatedConfig } from '../pagination.interface';

export class TeacherPaginationConfig implements PaginatedConfig {
  searchableFields = [user.name, user.email, teacher.title];

  sortFields = {
    name: user.name,
    email: user.email,
    teacherId: teacher.id,
    title: teacher.title,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db
      .select()
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(teacher, eq(user.id, teacher.userId))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(teacher, eq(user.id, teacher.userId))
      .where(and(...filters));
    return total;
  }
}

export const teacherPaginationConfig = new TeacherPaginationConfig();
