import { and, count, SQL } from 'drizzle-orm';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { DB } from 'src/database/db.provider';

export abstract class PaginationConfig<T extends PgTable<any>> {
  abstract table: T;
  abstract searchableFields: PgColumn[];
  abstract sortFields: Record<string, PgColumn>;
  abstract defaultSortField: string;

  getBaseQuery(db: DB) {
    return db
      .select()
      .from(this.table as any)
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(this.table as any)
      .where(and(...filters));
    return total;
  }
}
