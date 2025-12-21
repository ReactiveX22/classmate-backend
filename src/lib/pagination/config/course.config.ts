import { and, count, SQL } from 'drizzle-orm';
import { DB } from 'src/database/db.provider';
import { course } from 'src/database/schema';
import { PaginatedConfig } from '../pagination.interface';
import { PgSelect } from 'drizzle-orm/pg-core';

export class CoursePaginationConfig implements PaginatedConfig {
  searchableFields = [course.code, course.title, course.semester];

  sortFields = {
    code: course.code,
    title: course.title,
    semester: course.semester,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db.select().from(course).$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(course)
      .where(and(...filters));
    return total;
  }
}

export const coursePaginationConfig = new CoursePaginationConfig();
