import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, like, not, or, sql, SQL } from 'drizzle-orm';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { InjectDb, type DB } from 'src/database/db.provider';
import {
  AppNotification,
  InsertNotification,
  notification,
  notificationRead,
} from 'src/database/schema';
import { PaginationService } from 'src/lib/pagination/pagination.service';
import { NotificationPaginationConfig } from './notification.config';
import { NotificationCategory } from './notification.constants';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
    private readonly notificationPaginationConfig: NotificationPaginationConfig,
  ) {}

  async create(data: InsertNotification) {
    const [result] = await this.db
      .insert(notification)
      .values(data)
      .returning();

    return result;
  }

  async findAll(
    query: PaginationQueryDto,
    userId: string,
    orgId: string,
    userClassroomIds: string[],
  ) {
    const directCondition = eq(notification.recipientId, userId);

    const orgCondition = and(
      eq(notification.organizationId, orgId),
      like(notification.type, `${NotificationCategory.ORGANIZATION}%`),
    );

    let classroomCondition: SQL | undefined;
    if (userClassroomIds.length > 0) {
      classroomCondition = and(
        inArray(notification.entityId, userClassroomIds),
        like(notification.type, `${NotificationCategory.CLASSROOM}%`),
      );
    }

    const filters: SQL[] = [
      or(directCondition, orgCondition, classroomCondition)!,
      not(eq(notification.actorId, userId)),
    ];

    const configWithUser = Object.create(this.notificationPaginationConfig);
    configWithUser.getBaseQuery = (db: DB) =>
      this.notificationPaginationConfig.getAuthorizedQuery(db, userId);

    return this.paginationService.paginate<AppNotification>(
      {
        config: configWithUser,
        filters,
      },
      query,
    );
  }

  async markAsRead(notificationId: string, userId: string) {
    return await this.db
      .insert(notificationRead)
      .values({ notificationId, userId })
      .onConflictDoNothing();
  }

  async markAllAsRead(
    userId: string,
    orgId: string,
    userClassroomIds: string[],
  ) {
    const directCondition = eq(notification.recipientId, userId);

    const orgCondition = and(
      eq(notification.organizationId, orgId),
      like(notification.type, `${NotificationCategory.ORGANIZATION}%`),
    );

    let classroomCondition: SQL | undefined;
    if (userClassroomIds.length > 0) {
      classroomCondition = and(
        inArray(notification.entityId, userClassroomIds),
        like(notification.type, `${NotificationCategory.CLASSROOM}%`),
      );
    }

    const filters: SQL[] = [
      or(directCondition, orgCondition, classroomCondition)!,
      not(eq(notification.actorId, userId)),
    ];

    const unreadQuery = this.db
      .select({
        userId: sql<string>`${userId}`.as('userId'),
        notificationId: notification.id,
        readAt: sql`now()`.as('readAt'),
      })
      .from(notification)
      .leftJoin(
        notificationRead,
        and(
          eq(notificationRead.notificationId, notification.id),
          eq(notificationRead.userId, userId),
        ),
      )
      .where(and(isNull(notificationRead.readAt), ...filters));

    return await this.db
      .insert(notificationRead)
      .select(unreadQuery)
      .onConflictDoNothing();
  }
}
