import { and, count, SQL } from 'drizzle-orm';
import { DB } from 'src/database/db.provider';
import { courseSession } from 'src/database/schema';
import { PaginatedConfig } from '../pagination.interface';

export class CourseSessionPaginationConfig implements PaginatedConfig {
  searchableFields = [courseSession.name, courseSession.description];

  sortFields = {
    name: courseSession.name,
    startDate: courseSession.startDate,
    endDate: courseSession.endDate,
    isCurrent: courseSession.isCurrent,
    createdAt: courseSession.createdAt,
    updatedAt: courseSession.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db.select().from(courseSession).$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(courseSession)
      .where(and(...filters));
    return total;
  }
}

export const courseSessionPaginationConfig =
  new CourseSessionPaginationConfig();
