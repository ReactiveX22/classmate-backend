import { and, count, SQL } from 'drizzle-orm';
import { AnyPgTable, PgColumn, PgSelect, PgTable } from 'drizzle-orm/pg-core';
import { DB } from 'src/database/db.provider';

export abstract class PaginationConfig<T extends PgTable<any>> {
  abstract table: T;
  abstract searchableFields: PgColumn[];
  abstract sortFields: Record<string, PgColumn>;
  abstract defaultSortField: string;
  defaultSortOrder?: 'asc' | 'desc';

  getBaseQuery(db: DB): PgSelect {
    // Drizzle cannot resolve the generic table handle in `.from()` (tsc
    // rejects the conditional-table overload); confine the cast here so
    // subclasses keep typed queries.

    const table = this.table as AnyPgTable;
    return db.select().from(table).$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })

      .from(this.table as any)
      .where(and(...filters));
    return total;
  }
}
