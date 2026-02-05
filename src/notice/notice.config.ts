import { Injectable } from '@nestjs/common';
import { DB } from 'better-auth/adapters/drizzle';
import { and, count, eq, SQL } from 'drizzle-orm';
import { notice, user } from 'src/database/schema';
import { PaginationConfig } from 'src/lib/pagination/pagination.config';

@Injectable()
export class NoticePaginationConfig extends PaginationConfig<typeof notice> {
  table = notice;
  searchableFields = [notice.title, notice.content];
  sortFields = {
    title: notice.title,
    createdAt: notice.createdAt,
    updatedAt: notice.updatedAt,
  };
  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db
      .select({
        notice: notice,
        author: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(notice)
      .innerJoin(user, eq(notice.authorId, user.id))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(notice)
      .innerJoin(user, eq(notice.authorId, user.id))
      .where(and(...filters));
    return total;
  }
}
