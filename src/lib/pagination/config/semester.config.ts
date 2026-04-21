import { and, count, SQL } from 'drizzle-orm';
import { DB } from 'src/database/db.provider';
import { semester } from 'src/database/schema';
import { PaginatedConfig } from '../pagination.interface';

export class SemesterPaginationConfig implements PaginatedConfig {
  searchableFields = [semester.ordinal, semester.name];

  sortFields = {
    ordinal: semester.ordinal,
    name: semester.name,
    createdAt: semester.createdAt,
    updatedAt: semester.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db.select().from(semester).$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(semester)
      .where(and(...filters));
    return total;
  }
}

export const semesterPaginationConfig = new SemesterPaginationConfig();
