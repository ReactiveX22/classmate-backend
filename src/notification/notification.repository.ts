import { Injectable } from '@nestjs/common';
import { InjectDb, type DB } from 'src/database/db.provider';
import { InsertNotification, notification } from 'src/database/schema';

@Injectable()
export class NotificationRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: InsertNotification) {
    const [result] = await this.db
      .insert(notification)
      .values(data)
      .returning();

    return result;
  }
}
