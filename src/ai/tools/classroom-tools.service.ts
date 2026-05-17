import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ClassroomRepository } from '../../classroom/classroom.repository';
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
    private readonly classroomRepository: ClassroomRepository,
    private readonly postRepository: ClassroomPostRepository,
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  getTools() {
    return [
      this.buildListClassroomsTool(),
      this.buildGetPostsTool(),
      this.buildGetSubmissionsTool(),
    ];
  }

  private buildListClassroomsTool() {
    const classroomRepository = this.classroomRepository;

    return tool(
      async (_, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;

        if (!user?.id) {
          return 'No user context available. Cannot fetch classrooms.';
        }

        const classrooms = await classroomRepository.findJoinedClassrooms(
          user.id,
        );

        if (!classrooms.length) {
          return 'You are not enrolled in any classrooms.';
        }

        const formatted = classrooms.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section,
        }));

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'list_user_classrooms',
        description:
          'List all classrooms the user is enrolled in (as a student or teacher). ' +
          'Use this to find classroom IDs when the user asks about their classes or when you need to switch context.',
        // Groq cannot handle empty schemas; use a dummy optional parameter
        schema: z.object({
          _dummy: z.string().optional().describe('Internal parameter'),
        }),
      },
    );
  }

  private buildGetPostsTool() {
    const postRepository = this.postRepository;

    return tool(
      async (
        { limit, type, classroomId: argClassroomId },
        config: ToolRunnableConfig,
      ) => {
        const { classroomId: configClassroomId } = (config.configurable ??
          {}) as ToolConfigurable;
        const classroomId = argClassroomId || configClassroomId;

        if (!classroomId) {
          return 'No classroom context available. Please provide a classroomId or call list_user_classrooms first.';
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
          classroomId: z
            .string()
            .uuid()
            .optional()
            .describe('The ID of the classroom to fetch posts from.'),
          limit: z.coerce
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
    const classroomRepository = this.classroomRepository;

    return tool(
      async (
        { postId, classroomId: argClassroomId },
        config: ToolRunnableConfig,
      ) => {
        const { user, classroomId: configClassroomId } = (config.configurable ??
          {}) as ToolConfigurable;
        const classroomId = argClassroomId || configClassroomId;

        if (!classroomId) {
          return 'No classroom context available. Please provide a classroomId or call list_user_classrooms first.';
        }

        if (argClassroomId && user?.id) {
          const joined = await classroomRepository.findJoinedClassrooms(
            user.id,
          );
          if (!joined.some((c) => c.id === argClassroomId)) {
            return 'Access denied to the specified classroom.';
          }
        }

        const userRole = user?.role ?? '';
        const isTeacher = userRole === 'instructor' || userRole === 'admin';

        if (isTeacher) {
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
        }

        const submission = await submissionRepository.fetchOneByUser(
          user!.id,
          postId,
        );

        if (!submission) {
          return 'You have not submitted anything for this assignment yet.';
        }

        const formatted = {
          status: submission.status,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
          grade: submission.grade,
          feedback: submission.feedback,
        };

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'get_assignment_submissions',
        description:
          "Get submission information for an assignment. For teachers: shows all students' submission status. For students: shows their own submission status, grade, and feedback.",
        schema: z.object({
          postId: z.string().describe('The assignment post ID'),
          classroomId: z
            .string()
            .uuid()
            .optional()
            .describe(
              'The ID of the classroom. While not strictly needed for this tool if postId is known, it helps with consistency.',
            ),
        }),
      },
    );
  }
}
