import { Inject, Injectable } from '@nestjs/common';
import { SQL, and, asc, count, desc, ilike, or, eq } from 'drizzle-orm';
import { PgSelect } from 'drizzle-orm/pg-core';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import {
  calculateOffset,
  createPaginatedResponse,
} from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { user } from 'src/database/schema';

export interface PaginationOptions<T> {
  // Base query builder factory
  getBaseQuery: (db: DB) => PgSelect;

  // Filter configuration
  filters: SQL[];

  // Search configuration
  search?: {
    term?: string;
    fields?: any[];
  };

  // Sort configuration
  sort?: {
    allowedFields: Record<string, any>;
    defaultField?: string;
    defaultOrder?: 'asc' | 'desc';
  };

  // Optional custom count query
  getCountQuery?: (db: DB, filters: SQL[]) => Promise<number>;

  // Optional data transformation
  transform?: (data: any[]) => T[];
}

export const PAGINATION_SERVICE = 'PAGINATION_SERVICE';
export const InjectPaginationService = () => Inject(PAGINATION_SERVICE);

@Injectable()
export class PaginationService {
  constructor(@InjectDb() private readonly db: DB) {}

  /**
   * Main pagination method
   */
  async paginate<T>(
    options: PaginationOptions<T>,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<T>> {
    const {
      getBaseQuery,
      filters = [],
      search,
      sort,
      getCountQuery,
      transform,
    } = options;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = calculateOffset(page, limit);

    // Get base query with injected db instance
    let dynamicQuery = getBaseQuery(this.db).$dynamic();
    const allConditions: SQL[] = [...filters];

    // Add search if provided
    if (search?.term && search.fields?.length) {
      const searchConditions = search.fields.map((field) =>
        ilike(field, `%${search.term}%`),
      );
      const searchCondition = or(...searchConditions);
      if (searchCondition) {
        allConditions.push(searchCondition);
      }
    }

    // Apply all conditions
    if (allConditions.length > 0) {
      dynamicQuery = dynamicQuery.where(and(...allConditions));
    }

    // Apply sorting
    if (sort) {
      const sortField =
        query.sortBy && sort.allowedFields[query.sortBy]
          ? sort.allowedFields[query.sortBy]
          : sort.allowedFields[sort.defaultField || 'createdAt'];

      const sortOrder = query.sortOrder === 'asc' ? asc : desc;

      if (sortField) {
        dynamicQuery = dynamicQuery.orderBy(sortOrder(sortField));
      }
    }

    // Get total count
    let totalItems: number;
    if (getCountQuery) {
      totalItems = await getCountQuery(this.db, allConditions);
    } else {
      // Default count using the same conditions
      const countQb = dynamicQuery.as('count_qb');
      const [{ count: totalCount }] = await this.db
        .select({ count: count() })
        .from(countQb);
      totalItems = totalCount;
    }

    // Apply pagination
    const rawData = await dynamicQuery.limit(limit).offset(offset);

    // Transform data if needed
    const data = transform ? transform(rawData) : (rawData as T[]);

    return createPaginatedResponse(data, query, totalItems);
  }

  /**
   * Helper to build organization filters
   */
  buildOrganizationFilters(
    organizationId: string,
    role?: string,
    extraFilters: SQL[] = [],
  ): SQL[] {
    const filters: SQL[] = [
      eq(user.organizationId, organizationId),
      ...extraFilters,
    ];

    if (role) {
      filters.push(eq(user.role, role));
    }

    return filters;
  }

  /**
   * Helper for building search configuration
   */
  buildSearchConfig(
    searchTerm?: string,
    searchableFields: any[] = [],
  ): { term?: string; fields?: any[] } | undefined {
    if (!searchTerm || searchableFields.length === 0) {
      return undefined;
    }

    return {
      term: searchTerm,
      fields: searchableFields,
    };
  }

  /**
   * Helper for building sort configuration
   */
  buildSortConfig<T extends Record<string, any>>(
    fieldMappings: T,
    defaultField: keyof T = 'createdAt' as keyof T,
    defaultOrder: 'asc' | 'desc' = 'desc',
  ) {
    return {
      allowedFields: fieldMappings,
      defaultField: defaultField as string,
      defaultOrder,
    };
  }
}
