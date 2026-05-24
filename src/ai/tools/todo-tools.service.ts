import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { User } from 'src/auth/auth.factory';
import { TodoService } from 'src/todo/todo.service';
import { CreateTodoDto } from 'src/todo/dto/create-todo.dto';
import { UpdateTodoDto } from 'src/todo/dto/update-todo.dto';

interface ToolConfigurable {
  user?: User;
}

@Injectable()
export class TodoToolsService {
  constructor(private readonly todoService: TodoService) {}

  getTools() {
    return [
      this.buildListTodosTool(),
      this.buildCreateTodoTool(),
      this.buildUpdateTodoTool(),
      this.buildDeleteTodoTool(),
    ];
  }

  private buildListTodosTool() {
    const todoService = this.todoService;

    return tool(
      async (_, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;
        if (!user?.id) return 'No user context available.';
        const todos = await todoService.findAll({}, user);
        return JSON.stringify(todos, null, 2);
      },
      {
        name: 'list_tasks',
        description: 'List the user tasks.',
        schema: z.object({
          _dummy: z.string().optional().describe('Internal parameter'),
        }),
      },
    );
  }

  private buildCreateTodoTool() {
    const todoService = this.todoService;

    return tool(
      async (
        { title, description, status, priority },
        config: ToolRunnableConfig,
      ) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;
        if (!user?.id) return 'No user context available.';
        const result = await todoService.create(
          {
            title,
            description,
            status,
            priority,
          } satisfies CreateTodoDto,
          user,
        );
        return JSON.stringify(result, null, 2);
      },
      {
        name: 'create_task',
        description: 'Create a new task for the user.',
        schema: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        }),
      },
    );
  }

  private buildUpdateTodoTool() {
    const todoService = this.todoService;

    return tool(
      async ({ id, ...dto }, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;
        if (!user?.id) return 'No user context available.';
        const result = await todoService.update(
          id,
          dto satisfies UpdateTodoDto,
          user,
        );
        return JSON.stringify(result, null, 2);
      },
      {
        name: 'update_task',
        description: 'Update an existing task.',
        schema: z.object({
          id: z.string().uuid(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        }),
      },
    );
  }

  private buildDeleteTodoTool() {
    const todoService = this.todoService;

    return tool(
      async ({ id }, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;
        if (!user?.id) return 'No user context available.';
        await todoService.delete(id, user);
        return `Deleted task ${id}`;
      },
      {
        name: 'delete_task',
        description: 'Delete an existing task.',
        schema: z.object({
          id: z.string().uuid(),
        }),
      },
    );
  }
}
