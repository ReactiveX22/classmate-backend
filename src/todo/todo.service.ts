import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ApplicationNotFoundException } from 'src/common/exceptions/application.exception';
import { type InsertTodo } from 'src/database/schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoRepository } from './todo.repository';

@Injectable()
export class TodoService {
  constructor(private readonly todoRepository: TodoRepository) {}

  async findAll(query: PaginationQueryDto, user: User) {
    return this.todoRepository.findAll(query, user.id);
  }

  async findOne(id: string, user: User) {
    const todo = await this.todoRepository.findById(user.id, id);
    if (!todo) {
      throw new ApplicationNotFoundException('Todo not found');
    }
    return todo;
  }

  async create(dto: CreateTodoDto, user: User) {
    const payload: InsertTodo = {
      userId: user.id,
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'pending',
      priority: dto.priority ?? 'medium',
    };
    return this.todoRepository.create(payload);
  }

  async update(id: string, dto: UpdateTodoDto, user: User) {
    const existing = await this.todoRepository.findById(user.id, id);
    if (!existing) {
      throw new ApplicationNotFoundException('Todo not found');
    }

    const updated = await this.todoRepository.update(user.id, id, dto);
    return updated;
  }

  async delete(id: string, user: User) {
    const existing = await this.todoRepository.findById(user.id, id);
    if (!existing) {
      throw new ApplicationNotFoundException('Todo not found');
    }

    return this.todoRepository.delete(user.id, id);
  }
}
