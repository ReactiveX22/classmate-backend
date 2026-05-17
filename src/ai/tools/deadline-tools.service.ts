import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ClassroomRepository } from '../../classroom/classroom.repository';

interface ToolConfigurable {
  user?: {
    id: string;
    role?: string;
  };
  classroomId?: string;
}

@Injectable()
export class DeadlineToolsService {
  constructor(private readonly classroomRepository: ClassroomRepository) {}

  getTools() {
    return [this.buildGetUpcomingDeadlinesTool()];
  }

  private buildGetUpcomingDeadlinesTool() {
    const classroomRepository = this.classroomRepository;

    return tool(
      async (
        { classroomId: argClassroomId, limit },
        config: ToolRunnableConfig,
      ) => {
        const { user, classroomId: configClassroomId } = (config.configurable ??
          {}) as ToolConfigurable;

        if (!user?.id) {
          return 'No user context available. Cannot fetch upcoming deadlines.';
        }

        const userRole = user.role ?? '';
        const isStudent = userRole === 'student';

        if (argClassroomId || configClassroomId) {
          const classroomId = (argClassroomId || configClassroomId)!;
          const joined = await classroomRepository.findJoinedClassrooms(
            user.id,
          );
          if (!joined.some((c) => c.id === classroomId)) {
            return 'Access denied to the specified classroom.';
          }
          const posts = await classroomRepository.findUpcomingPosts(
            classroomId,
            user.id,
            isStudent,
          );

          if (!posts.length) {
            return 'No upcoming deadlines found in this classroom.';
          }

          const formatted = posts.slice(0, limit).map((p) => ({
            id: p.id,
            title: p.title,
            dueAt: p.dueAt,
          }));

          return JSON.stringify(formatted, null, 2);
        }

        const classrooms = await classroomRepository.findJoinedClassrooms(
          user.id,
        );

        if (!classrooms.length) {
          return 'You are not enrolled in any classrooms.';
        }

        const allDeadlines: {
          classroomName: string;
          title: string | null;
          dueAt: string;
        }[] = [];

        for (const classroom of classrooms) {
          const posts = await classroomRepository.findUpcomingPosts(
            classroom.id,
            user.id,
            isStudent,
          );
          for (const post of posts) {
            allDeadlines.push({
              classroomName: classroom.name,
              title: post.title,
              dueAt: post.dueAt,
            });
          }
        }

        if (!allDeadlines.length) {
          return 'No upcoming deadlines found across all your classrooms.';
        }

        allDeadlines.sort(
          (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
        );

        const formatted = allDeadlines.slice(0, limit);

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'get_upcoming_deadlines',
        description:
          'List upcoming assignment deadlines. Can fetch deadlines for a specific classroom or across all classrooms. ' +
          'Use when the user asks about upcoming assignments, due dates, or what is due soon.',
        schema: z.object({
          classroomId: z
            .string()
            .uuid()
            .optional()
            .describe(
              'Optional classroom ID to filter deadlines. If omitted, fetches across all classrooms.',
            ),
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(20)
            .default(10)
            .describe('Number of deadlines to return (1–20, default 10)'),
        }),
      },
    );
  }
}
