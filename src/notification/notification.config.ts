import { Injectable } from '@nestjs/common';
import { DB } from 'better-auth/adapters/drizzle';
import { and, count, eq } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';
import { notification, user } from 'src/database/schema';
import { PaginationConfig } from 'src/lib/pagination/pagination.config';

@Injectable()
export class NotificationPaginationConfig extends PaginationConfig<
  typeof notification
> {
  table = notification;
  searchableFields = [notification.title, notification.content];
  sortFields = {
    title: notification.title,
    createdAt: notification.createdAt,
    type: notification.type,
  };
  defaultSortField = 'createdAt';
  defaultSortOrder: 'asc' | 'desc' = 'desc';

  getBaseQuery(db: DB) {
    return db
      .select({
        notification: notification,
        actor: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(notification)
      .leftJoin(user, eq(notification.actorId, user.id))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(notification)
      .leftJoin(user, eq(notification.actorId, user.id))
      .where(and(...filters));
    return total;
  }
}
