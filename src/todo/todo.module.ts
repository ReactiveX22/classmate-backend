import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { TodoPaginationConfig } from './todo.config';
import { TodoController } from './todo.controller';
import { TodoRepository } from './todo.repository';
import { TodoService } from './todo.service';

@Module({
  imports: [DatabaseModule, PaginationModule],
  providers: [TodoService, TodoRepository, TodoPaginationConfig],
  controllers: [TodoController],
  exports: [TodoRepository],
})
export class TodoModule {}
