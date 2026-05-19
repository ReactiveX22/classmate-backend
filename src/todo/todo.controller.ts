import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoService } from './todo.service';

@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Session() session: AppUserSession,
  ) {
    return this.todoService.findAll(query, session.user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: AppUserSession,
  ) {
    return this.todoService.findOne(id, session.user);
  }

  @Post()
  async create(@Body() dto: CreateTodoDto, @Session() session: AppUserSession) {
    return this.todoService.create(dto, session.user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
    @Session() session: AppUserSession,
  ) {
    return this.todoService.update(id, dto, session.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: AppUserSession,
  ) {
    await this.todoService.delete(id, session.user);
  }
}
