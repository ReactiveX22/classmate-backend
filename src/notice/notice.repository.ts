import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';
import { type InsertNotice, notice } from 'src/database/schema';

@Injectable()
export class NoticeRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: InsertNotice) {
    const [result] = await this.db.insert(notice).values(data).returning();
    return result;
  }
}
