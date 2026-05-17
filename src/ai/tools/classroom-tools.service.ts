import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ClassroomRepository } from '../../classroom/classroom.repository';
import { AttendanceRepository } from '../../classroom/repositories/attendance.repository';
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
    private readonly attendanceRepository: AttendanceRepository,
  ) {}

  getTools() {
    return [
      this.buildListClassroomsTool(),
      this.buildGetPostsTool(),
      this.buildGetPostByIdTool(),
      this.buildGetSubmissionsTool(),
      this.buildGetAttendancesTool(),
      this.buildGetGradesTool(),
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

  private buildGetPostByIdTool() {
    const postRepository = this.postRepository;
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

        const post = await postRepository.fetchOne(postId, user?.id);

        if (!post) {
          return 'Post not found.';
        }

        if (post.classroomId !== classroomId) {
          return 'Post does not belong to the specified classroom.';
        }

        const formatted: Record<string, unknown> = {
          id: post.id,
          title: post.title,
          type: post.type,
          content: post.content,
          authorName: post.authorName,
          createdAt: post.createdAt,
        };

        if (post.type === 'assignment' && post.assignmentData) {
          formatted.dueDate = post.assignmentData.dueDate;
          formatted.points = post.assignmentData.points;
          formatted.allowLateSubmission =
            post.assignmentData.allowLateSubmission;
        }

        if (
          post.type === 'question' &&
          post.questionData &&
          post.questionData.mode === 'poll'
        ) {
          formatted.options = post.questionData.options;
          formatted.selectionMode = post.questionData.selectionMode;
        }

        if (post.attachments?.length) {
          formatted.attachments = post.attachments.map(
            (a: { id: string; name: string; url: string }) => ({
              name: a.name,
              url: a.url,
            }),
          );
        }

        if (user?.role === 'student' && user.id) {
          const submission = await this.submissionRepository.fetchOneByUser(
            user.id,
            postId,
          );
          if (submission) {
            formatted.mySubmission = {
              status: submission.status,
              submittedAt: submission.submittedAt?.toISOString() ?? null,
              grade: submission.grade,
              feedback: submission.feedback,
            };
          }
        }

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'get_classroom_post_by_id',
        description:
          'Get detailed information about a specific classroom post by its ID. ' +
          'Includes full content, assignment details (due date, points), question options, attachments, ' +
          "and the student's own submission status if applicable. " +
          'Use when the user asks for details about a specific post or assignment.',
        schema: z.object({
          postId: z.string().describe('The ID of the post to fetch'),
          classroomId: z
            .string()
            .uuid()
            .optional()
            .describe(
              'The ID of the classroom. Helps verify the post belongs to the expected classroom.',
            ),
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

  private buildGetAttendancesTool() {
    const classroomRepository = this.classroomRepository;
    const attendanceRepository = this.attendanceRepository;

    return tool(
      async ({ classroomId, month, year }, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;

        if (!user?.id) {
          return 'No user context available. Cannot fetch attendance.';
        }

        const joined = await classroomRepository.findJoinedClassrooms(user.id);
        if (!joined.some((c) => c.id === classroomId)) {
          return 'Access denied to the specified classroom.';
        }

        const userRole = user.role ?? '';
        const isTeacher = userRole === 'instructor' || userRole === 'admin';

        const now = new Date();
        const targetYear = year ?? now.getFullYear();
        const targetMonth = month ?? now.getMonth() + 1;
        const monthName = new Date(targetYear, targetMonth - 1).toLocaleString(
          'en',
          { month: 'long' },
        );

        if (isTeacher) {
          const records = await attendanceRepository.getMonthlyAttendance(
            classroomId,
            undefined,
            targetYear,
            targetMonth,
          );

          const studentMap = new Map<
            string,
            {
              name: string;
              present: number;
              late: number;
              absent: number;
              total: number;
            }
          >();

          for (const record of records) {
            const existing = studentMap.get(record.studentId);
            if (existing) {
              existing[record.status]++;
              existing.total++;
            } else {
              studentMap.set(record.studentId, {
                name: record.studentName ?? record.studentId,
                present: record.status === 'present' ? 1 : 0,
                late: record.status === 'late' ? 1 : 0,
                absent: record.status === 'absent' ? 1 : 0,
                total: 1,
              });
            }
          }

          const formatted = Array.from(studentMap.entries()).map(([, data]) => {
            const rate =
              data.total > 0
                ? Math.round(((data.present + data.late) / data.total) * 100)
                : 0;
            return {
              name: data.name,
              present: data.present,
              late: data.late,
              absent: data.absent,
              total: data.total,
              rate,
            };
          });

          if (!formatted.length) {
            return `No attendance records found for ${monthName} ${targetYear}.`;
          }

          return JSON.stringify(
            {
              month: monthName,
              year: targetYear,
              students: formatted,
            },
            null,
            2,
          );
        }

        const records = await attendanceRepository.getMonthlyAttendance(
          classroomId,
          user.id,
          targetYear,
          targetMonth,
        );

        if (!records.length) {
          return `No attendance records found for you in ${monthName} ${targetYear}.`;
        }

        const stats = {
          present: 0,
          late: 0,
          absent: 0,
          total: records.length,
        };
        for (const record of records) {
          stats[record.status]++;
        }
        const rate =
          stats.total > 0
            ? Math.round(((stats.present + stats.late) / stats.total) * 100)
            : 0;

        return JSON.stringify(
          {
            month: monthName,
            year: targetYear,
            student: records[0]?.studentName ?? user.id,
            ...stats,
            rate,
            records: records.map((r) => ({
              date: r.date,
              status: r.status,
              remarks: r.remarks,
            })),
          },
          null,
          2,
        );
      },
      {
        name: 'get_attendances',
        description:
          'Get attendance data for the current or specified month. ' +
          'For teachers: returns all students attendance summary with rates. ' +
          'For students: returns their own attendance records with details. ' +
          'Present the data in a clean markdown table format when responding to the user.',
        schema: z.object({
          classroomId: z.string().uuid().describe('The ID of the classroom'),
          month: z.coerce
            .number()
            .int()
            .min(1)
            .max(12)
            .optional()
            .describe('Month number (1-12). Defaults to current month'),
          year: z.coerce
            .number()
            .int()
            .optional()
            .describe('Year. Defaults to current year'),
        }),
      },
    );
  }

  private buildGetGradesTool() {
    const classroomRepository = this.classroomRepository;

    return tool(
      async ({ classroomId, studentId }, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;

        if (!user?.id) {
          return 'No user context available. Cannot fetch grades.';
        }

        const joined = await classroomRepository.findJoinedClassrooms(user.id);
        if (!joined.some((c) => c.id === classroomId)) {
          return 'Access denied to the specified classroom.';
        }

        const userRole = user.role ?? '';
        const isTeacher = userRole === 'instructor' || userRole === 'admin';

        if (isTeacher) {
          if (studentId) {
            const details = await classroomRepository.getStudentGradeDetails(
              classroomId,
              studentId,
            );

            return JSON.stringify(
              {
                student: details.studentName,
                overall_grade: details.overall_grade,
                missing_work: details.missing_work,
                assignments: details.assignments.map((a) => ({
                  title: a.title,
                  grade: a.grade,
                  maxPoints: a.maxPoints,
                  percentage: a.percentage,
                  feedback: a.feedback,
                  status: a.status,
                  dueDate: a.dueDate,
                })),
              },
              null,
              2,
            );
          }

          const stats =
            await classroomRepository.getAllStudentsGradeStats(classroomId);

          if (!stats.length) {
            return 'No students or assignments found in this classroom.';
          }

          return JSON.stringify({ students: stats }, null, 2);
        }

        const details = await classroomRepository.getStudentGradeDetails(
          classroomId,
          user.id,
        );

        if (!details.assignments.length) {
          return 'No assignments found in this classroom.';
        }

        return JSON.stringify(
          {
            overall_grade: details.overall_grade,
            missing_work: details.missing_work,
            assignments: details.assignments.map((a) => ({
              title: a.title,
              grade: a.grade,
              maxPoints: a.maxPoints,
              percentage: a.percentage,
              feedback: a.feedback,
              status: a.status,
              dueDate: a.dueDate,
            })),
          },
          null,
          2,
        );
      },
      {
        name: 'get_grades',
        description:
          'Get grade information for a classroom. ' +
          'For teachers without studentId: returns all students grade summaries (overall grade % and missing work count). ' +
          'For teachers with studentId: returns detailed per-assignment grades with feedback for that student. ' +
          'For students: returns their own detailed grades with per-assignment breakdown. ' +
          'Present the data in a clean markdown table format when responding to the user.',
        schema: z.object({
          classroomId: z.string().uuid().describe('The ID of the classroom'),
          studentId: z
            .string()
            .optional()
            .describe(
              'Optional student ID for teachers to get detailed grades for a specific student',
            ),
        }),
      },
    );
  }
}
