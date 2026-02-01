import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { type InsertNotice, notice } from 'src/database/schema';

@Injectable()
export class NoticeRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: InsertNotice) {
    const [result] = await this.db.insert(notice).values(data).returning();
    return result;
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<InsertNotice>,
  ) {
    const [result] = await this.db
      .update(notice)
      .set(data)
      .where(and(eq(notice.id, id), eq(notice.organizationId, organizationId)))
      .returning();
    return result;
  }

  async delete(organizationId: string, id: string) {
    const [result] = await this.db
      .delete(notice)
      .where(and(eq(notice.id, id), eq(notice.organizationId, organizationId)))
      .returning();
    return result;
  }
}
