import { Injectable } from '@nestjs/common';
import { and, eq, inArray, like, or, SQL } from 'drizzle-orm';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { InjectDb, type DB } from 'src/database/db.provider';
import {
  AppNotification,
  InsertNotification,
  notification,
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
    // 1. Direct notifications: recipientId == userId
    const directCondition = eq(notification.recipientId, userId);

    // 2. Organization notifications: organizationId == orgId AND type starts with ORGANIZATION
    const orgCondition = and(
      eq(notification.organizationId, orgId),
      like(notification.type, `${NotificationCategory.ORGANIZATION}%`),
    );

    // 3. Classroom notifications: entityId IN userClassroomIds AND type starts with CLASSROOM
    // Only apply if user is in any classrooms
    let classroomCondition: SQL | undefined;
    if (userClassroomIds.length > 0) {
      classroomCondition = and(
        inArray(notification.entityId, userClassroomIds),
        like(notification.type, `${NotificationCategory.CLASSROOM}%`),
      );
    }

    const filters: SQL[] = [
      or(directCondition, orgCondition, classroomCondition)!,
    ];

    return this.paginationService.paginate<AppNotification>(
      {
        config: this.notificationPaginationConfig,
        filters,
      },
      query,
    );
  }
}
