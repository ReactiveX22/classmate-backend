import { Injectable } from '@nestjs/common';
import { and, eq, SQL } from 'drizzle-orm';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  type InsertNotice,
  notice,
  type SelectNotice,
} from 'src/database/schema';
import { PaginationService } from 'src/lib/pagination/pagination.service';
import { NoticePaginationConfig } from './notice.config';

@Injectable()
@Injectable()
export class NoticeRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
    private readonly noticePaginationConfig: NoticePaginationConfig,
  ) {}

  async create(data: InsertNotice) {
    const [result] = await this.db.insert(notice).values(data).returning();
    return result;
  }

  async findAll(query: PaginationQueryDto, orgId: string) {
    const filters: SQL[] = [eq(notice.organizationId, orgId)];

    return this.paginationService.paginate<SelectNotice>(
      {
        config: this.noticePaginationConfig,
        filters,
      },
      query,
    );
  }

  async findById(organizationId: string, id: string) {
    const [result] = await this.db
      .select()
      .from(notice)
      .where(and(eq(notice.id, id), eq(notice.organizationId, organizationId)));
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
