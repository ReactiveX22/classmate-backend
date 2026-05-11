import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ClassroomPostRepository } from '../../classroom/repositories/classroom-post.repository';
import { SubmissionRepository } from '../../classroom/repositories/submission.repository';

interface ToolConfigurable {
  classroomId?: string;
  user?: {
    id: string;
    role?: string;
  };
}

@Injectable()
export class ClassroomToolsService {
  constructor(
    private readonly postRepository: ClassroomPostRepository,
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  getTools() {
    return [this.buildGetPostsTool(), this.buildGetSubmissionsTool()];
  }

  private buildGetPostsTool() {
    const postRepository = this.postRepository;

    return tool(
      async ({ limit, type }, config: ToolRunnableConfig) => {
        const { classroomId } = (config.configurable ?? {}) as ToolConfigurable;

        if (!classroomId) {
          return 'No classroom context available. Cannot fetch posts.';
        }

        const posts = await postRepository.findRecentForTools(
          classroomId,
          limit,
          type,
        );

        if (!posts.length) {
          return 'No posts found in this classroom.';
        }

        const formatted = posts.map((post) => ({
          id: post.id,
          title: post.title,
          type: post.type,
          createdAt: post.createdAt,
          authorName: post.authorName,
        }));

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'get_classroom_posts',
        description:
          'List recent posts, announcements, assignments, and materials in the classroom. ' +
          'Use when the user asks what was posted, assigned, or announced. ' +
          'Optionally filter by post type.',
        schema: z.object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(10)
            .default(5)
            .describe('Number of posts to return (1–10, default 5)'),
          type: z
            .enum(['announcement', 'assignment', 'question', 'material'])
            .optional()
            .describe('Filter by post type'),
        }),
      },
    );
  }

  private buildGetSubmissionsTool() {
    const submissionRepository = this.submissionRepository;

    return tool(
      async ({ postId }, config: ToolRunnableConfig) => {
        const { user, classroomId } = (config.configurable ??
          {}) as ToolConfigurable;

        if (!classroomId) {
          return 'No classroom context available. Cannot fetch submissions.';
        }

        const userRole = user?.role ?? '';
        const isTeacher = userRole === 'instructor' || userRole === 'admin';

        if (!isTeacher) {
          return 'This tool is only available to teachers.';
        }

        const submissions =
          await submissionRepository.findByPostIdForTools(postId);

        if (!submissions.length) {
          return 'No submissions found for this assignment.';
        }

        const formatted = submissions.map((sub) => ({
          studentName: sub.studentName,
          status: sub.status,
          submittedAt: sub.submittedAt,
        }));

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'get_assignment_submissions',
        description:
          'Get submission status for an assignment. Shows which students have submitted, are pending, or are missing. Only available to teachers.',
        schema: z.object({
          postId: z.string().describe('The assignment post ID'),
        }),
      },
    );
  }
}
