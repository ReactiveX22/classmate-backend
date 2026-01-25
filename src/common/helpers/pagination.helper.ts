import { eq, SQL } from 'drizzle-orm';
import { PgSelect } from 'drizzle-orm/pg-core';
import { type DB } from 'src/database/db.provider';
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
