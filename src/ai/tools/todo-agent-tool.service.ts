import { tool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { User } from 'src/auth/auth.factory';
import { TodoAgentService } from '../agents/todo/todo-agent.service';

interface ToolConfigurable {
  user?: User;
}

@Injectable()
export class TodoAgentToolService {
  constructor(private readonly todoAgentService: TodoAgentService) {}

  getTools() {
    return [this.buildManageTodosTool()];
  }

  private buildManageTodosTool() {
    const todoAgentService = this.todoAgentService;

    return tool(
      async ({ request }, config) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;
        if (!user?.id) return 'No user context available.';
        return await todoAgentService.run(request, {
          user,
        });
      },
      {
        name: 'manage_tasks',
        description:
          'Delegate task-related requests to the task specialist agent. Do not directly echo the agents response to user',
        schema: z.object({
          request: z.string().min(1),
        }),
      },
    );
  }
}
