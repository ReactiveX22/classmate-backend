import { Inject, Injectable } from '@nestjs/common';
import { SQL, and, asc, count, desc, ilike, or } from 'drizzle-orm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import {
  calculateOffset,
  createPaginatedResponse,
} from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { PaginatedConfig } from './pagination.interface';

export interface PaginationOptions<T> {
  /**
   * Pagination configuration instance or class
   */
  config: PaginatedConfig<T>;

  /**
   * Additional filters to apply
   */
  filters?: SQL[];

  /**
   * Search query override (defaults to query.search)
   */
  searchQuery?: string;
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
    const { config, filters = [], searchQuery } = options;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = calculateOffset(page, limit);

    // Get base query with injected db instance
    let dynamicQuery = config.getBaseQuery(this.db).$dynamic();
    const allConditions: SQL[] = [...filters];

    // Add search if provided
    const term = searchQuery ?? query.search;
    if (term && config.searchableFields?.length) {
      const searchConditions = config.searchableFields.map((field) =>
        ilike(field, `%${term}%`),
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
    if (config.sortFields) {
      const defaultField = config.defaultSortField || 'createdAt';
      const sortBy =
        query.sortBy && config.sortFields[query.sortBy]
          ? query.sortBy
          : defaultField;

      const sortField = config.sortFields[sortBy];
      const sortOrder = query.sortOrder === 'asc' ? asc : desc;

      if (sortField) {
        dynamicQuery = dynamicQuery.orderBy(sortOrder(sortField));
      }
    }

    // Get total count
    let totalItems: number;
    if (config.getCountQuery) {
      totalItems = await config.getCountQuery(this.db, allConditions);
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
    const data = config.transform
      ? config.transform(rawData)
      : (rawData as T[]);

    return createPaginatedResponse(data, query, totalItems);
  }
}
