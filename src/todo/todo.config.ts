import { Injectable } from '@nestjs/common';
import { and, count, SQL } from 'drizzle-orm';
import { DB } from 'src/database/db.provider';
import { todo } from 'src/database/schema';
import { PaginationConfig } from 'src/lib/pagination/pagination.config';

@Injectable()
export class TodoPaginationConfig extends PaginationConfig<typeof todo> {
  table = todo;
  searchableFields = [todo.title, todo.description];
  sortFields = {
    title: todo.title,
    priority: todo.priority,
    status: todo.status,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db.select().from(todo).$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(todo)
      .where(and(...filters));
    return total;
  }
}
