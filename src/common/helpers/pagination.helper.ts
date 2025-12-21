import { type DB } from 'src/database/db.provider';
import { and, asc, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { PgSelect } from 'drizzle-orm/pg-core';
import { user } from 'src/database/schema';
import {
  PaginatedResponse,
  PaginationMeta,
  PaginationQueryDto,
} from '../dto/pagination.dto';

/**
 * Calculate the offset for database queries based on page and limit.
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Build pagination metadata from query params and total count.
 */
export function buildPaginationMeta(
  query: PaginationQueryDto,
  totalItems: number,
): PaginationMeta {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create a paginated response wrapper.
 */
export function createPaginatedResponse<T>(
  data: T[],
  query: PaginationQueryDto,
  totalItems: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: buildPaginationMeta(query, totalItems),
  };
}

export interface DrizzlePaginationOptions<T> {
  // Required: The database instance
  db: DB;

  // Required: The base Drizzle query builder
  queryBuilder: PgSelect;

  // Your existing filters
  filters?: SQL[];

  // Search configuration
  search?: {
    term?: string;
    fields?: any[]; // Drizzle columns to search in
  };

  // Sorting configuration
  sort?: {
    allowedFields: Record<string, any>; // Map sortBy values to columns
    defaultField?: string;
    defaultOrder?: 'asc' | 'desc';
  };

  // Optional: Custom count query (for complex joins)
  countQuery?: () => Promise<number>;

  // Optional: Transform result data
  transform?: (data: any[]) => T[];
}

/**
 * Main pagination helper for Drizzle queries
 */
export async function drizzlePaginate<T>(
  options: DrizzlePaginationOptions<T>,
  query: PaginationQueryDto,
): Promise<PaginatedResponse<T>> {
  const {
    queryBuilder,
    db,
    filters = [],
    search,
    sort,
    countQuery,
    transform,
  } = options;

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = calculateOffset(page, limit);

  // Build dynamic query
  let dynamicQuery = queryBuilder.$dynamic();
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

  // Apply conditions
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
  if (countQuery) {
    totalItems = await countQuery();
  } else {
    // Default count using the same conditions
    const countQb = dynamicQuery.$dynamic().as('count_qb');
    const [{ count: totalCount }] = await db
      .select({ count: count() })
      .from(countQb);
    totalItems = totalCount;
  }

  // Apply pagination
  const rawData = await dynamicQuery.limit(limit).offset(offset);

  // Transform data if needed
  const data = transform ? transform(rawData) : (rawData as T[]);

  // Use your existing utility
  return createPaginatedResponse(data, query, totalItems);
}

/**
 * Helper to build common filters for organization-based resources
 */
export function buildOrganizationFilters(
  organizationId: string,
  options: {
    table?: any;
    role?: string;
    extraFilters?: SQL[];
  } = {},
): SQL[] {
  const { table = user, role, extraFilters = [] } = options;
  const filters: SQL[] = [
    eq(table.organizationId, organizationId),
    ...extraFilters,
  ];

  if (role && table.role) {
    filters.push(eq(table.role, role));
  }

  return filters;
}

/**
 * Helper for building search configuration
 */
export function buildSearchConfig(
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
export function buildSortConfig<T extends Record<string, any>>(
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
