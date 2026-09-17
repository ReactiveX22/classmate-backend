import { SQL, type AnyColumn } from 'drizzle-orm';
import { PgSelect } from 'drizzle-orm/pg-core';
import { DB } from 'src/database/db.provider';

export interface PaginatedConfig<T = any> {
  /**
   * Base query builder factory
   */
  getBaseQuery(db: DB): PgSelect;

  /**
   * Searchable fields for ilike searching
   */
  searchableFields?: AnyColumn[];

  /**
   * Allowed fields for sorting
   */
  sortFields?: Record<string, AnyColumn>;

  /**
   * Default sort field
   */
  defaultSortField?: string;

  /**
   * Default sort order
   */
  defaultSortOrder?: 'asc' | 'desc';

  /**
   * Optional custom count query
   */
  getCountQuery?(db: DB, filters: SQL[]): Promise<number>;

  /**
   * Optional data transformation
   */
  transform?(data: unknown[]): T[];
}
