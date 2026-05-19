import { Injectable } from '@nestjs/common';
import { and, eq, SQL } from 'drizzle-orm';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type DB, InjectDb } from 'src/database/db.provider';
import { type InsertTodo, todo, type SelectTodo } from 'src/database/schema';
import { PaginationService } from 'src/lib/pagination/pagination.service';
import { TodoPaginationConfig } from './todo.config';

@Injectable()
export class TodoRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
    private readonly todoPaginationConfig: TodoPaginationConfig,
  ) {}

  async create(data: InsertTodo) {
    const [result] = await this.db.insert(todo).values(data).returning();
    return result;
  }

  async findAll(query: PaginationQueryDto, userId: string) {
    const filters: SQL[] = [eq(todo.userId, userId)];

    return this.paginationService.paginate<SelectTodo>(
      {
        config: this.todoPaginationConfig,
        filters,
      },
      query,
    );
  }

  async findById(userId: string, id: string) {
    const [result] = await this.db
      .select()
      .from(todo)
      .where(and(eq(todo.id, id), eq(todo.userId, userId)));
    return result;
  }

  async update(userId: string, id: string, data: Partial<InsertTodo>) {
    const [result] = await this.db
      .update(todo)
      .set(data)
      .where(and(eq(todo.id, id), eq(todo.userId, userId)))
      .returning();
    return result;
  }

  async delete(userId: string, id: string) {
    const [result] = await this.db
      .delete(todo)
      .where(and(eq(todo.id, id), eq(todo.userId, userId)))
      .returning();
    return result;
  }
}
