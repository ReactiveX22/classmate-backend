import { Injectable } from '@nestjs/common';
import { and, eq, exists, gte, inArray, notExists, or, sql } from 'drizzle-orm';
import {
  ClassroomPaginationConfig,
  ClassroomPostPaginationConfig,
} from 'src/classroom/classroom.config';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  assignmentSubmission,
  classroom,
  classroomMembers,
  classroomPost,
  classroomResourceBookmark,
  course,
  SelectClassroom,
  user,
} from 'src/database/schema';
import { PaginationService } from 'src/lib/pagination/pagination.service';
import { ListClassroomPostsDto } from './dto/list-classroom-posts.dto';

@Injectable()
export class ClassroomRepository {
  constructor(
    @InjectDb() private readonly db: DB,
    private readonly paginationService: PaginationService,
    private readonly classroomPaginationConfig: ClassroomPaginationConfig,
  ) {}

  async create(data: {
    courseId: string;
    teacherId: string;
    name: string;
    section?: string;
    classCode: string;
    description?: string;
  }) {
    return this.db.insert(classroom).values(data).returning();
  }

  async findAll(query: PaginationQueryDto, orgId: string, userId: string) {
    const filters = [
      eq(course.organizationId, orgId),
      or(
        eq(classroom.teacherId, userId),
        exists(
          this.db
            .select()
            .from(classroomMembers)
            .where(
              and(
                eq(classroomMembers.classroomId, classroom.id),
                eq(classroomMembers.studentId, userId),
              ),
            ),
        ),
      )!,
    ];

    return this.paginationService.paginate<SelectClassroom>(
      {
        config: this.classroomPaginationConfig,
        filters,
      },
      query,
    );
  }

  async update(id: string, data: Partial<typeof classroom.$inferInsert>) {
    return this.db
      .update(classroom)
      .set(data)
      .where(eq(classroom.id, id))
      .returning();
  }

  async delete(id: string) {
    return this.db.delete(classroom).where(eq(classroom.id, id)).returning();
  }

  async findById(id: string) {
    return this.db.query.classroom.findFirst({
      with: {
        course: true,
        teacher: true,
        classroomMembers: {
          with: {
            student: true,
          },
        },
      },
      where: eq(classroom.id, id),
    });
  }

  async addMembers(classroomId: string, studentIds: string[]) {
    return this.db
      .insert(classroomMembers)
      .values(
        studentIds.map((id) => ({
          classroomId: classroomId,
          studentId: id,
        })),
      )
      .returning();
  }

  async removeMembers(classroomId: string, studentIds: string[]) {
    if (studentIds.length === 0) return [];

    await this.db
      .delete(classroomMembers)
      .where(
        and(
          eq(classroomMembers.classroomId, classroomId),
          inArray(classroomMembers.studentId, studentIds),
        ),
      );
  }

  async leaveClassroom(classroomId: string, studentId: string) {
    await this.db
      .delete(classroomMembers)
      .where(
        and(
          eq(classroomMembers.classroomId, classroomId),
          eq(classroomMembers.studentId, studentId),
        ),
      );
  }

  async findPostsByClassroom(
    query: ListClassroomPostsDto,
    classroomId: string,
    isInstructor: boolean,
    teacherId: string,
    userId?: string,
  ) {
    const filters = [eq(classroomPost.classroomId, classroomId)];

    if (query.type) {
      filters.push(eq(classroomPost.type, query.type));
    }

    if (query.fromInstructor) {
      filters.push(eq(classroomPost.authorId, teacherId));
    }

    if (query.bookmarked && userId) {
      filters.push(
        exists(
          this.db
            .select({ id: classroomResourceBookmark.id })
            .from(classroomResourceBookmark)
            .where(
              and(
                eq(classroomResourceBookmark.postId, classroomPost.id),
                eq(classroomResourceBookmark.userId, userId),
              ),
            ),
        ),
      );
    }

    if (query.tags && query.tags.length > 0) {
      filters.push(
        or(
          ...query.tags.map(
            (tag) =>
              sql`${tag} = ANY(COALESCE(${classroomPost.tags}, ARRAY[]::text[]))`,
          ),
        )!,
      );
    }

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const likeTerm = `%${searchTerm}%`;
      filters.push(
        or(
          sql`${classroomPost.title} ILIKE ${likeTerm}`,
          sql`${classroomPost.content} ILIKE ${likeTerm}`,
          sql`EXISTS (
            SELECT 1
            FROM unnest(COALESCE(${classroomPost.tags}, ARRAY[]::text[])) AS tag
            WHERE tag ILIKE ${likeTerm}
          )`,
        )!,
      );
    }

    return this.paginationService.paginate(
      {
        config: new ClassroomPostPaginationConfig(userId, isInstructor),
        filters,
        searchQuery: '',
      },
      query,
    );
  }

  async findByClassCode(classCode: string) {
    return this.db.query.classroom.findFirst({
      where: eq(classroom.classCode, classCode),
      with: {
        course: true,
      },
    });
  }

  async fetchStudentGradeStats(classroomId: string, studentId: string) {
    const assignments = await this.db.query.classroomPost.findMany({
      where: and(
        eq(classroomPost.classroomId, classroomId),
        eq(classroomPost.type, 'assignment'),
      ),
      with: {
        submissions: {
          where: eq(assignmentSubmission.studentId, studentId),
        },
      },
    });

    let totalEarnedPoints = 0;
    let totalPossiblePoints = 0;

    assignments.forEach((assignment) => {
      const submission = assignment.submissions[0];
      const maxPoints = assignment.assignmentData?.points || 0;

      if (
        submission &&
        submission.status === 'graded' &&
        submission.grade !== null &&
        maxPoints > 0
      ) {
        totalEarnedPoints += submission.grade;
        totalPossiblePoints += maxPoints;
      }
    });

    const overallGradePercentage =
      totalPossiblePoints > 0
        ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100)
        : 0;

    const missingWorkCount = assignments.filter((assignment) => {
      const submission = assignment.submissions[0];
      const dueDate = assignment.assignmentData?.dueDate;

      if (!dueDate) return false;

      const dueDateTime = new Date(dueDate).getTime();
      const now = new Date().getTime();

      if (dueDateTime < now && (!submission || !submission.submittedAt)) {
        return true;
      }

      if (submission?.submittedAt) {
        const submittedDateTime = new Date(submission.submittedAt).getTime();
        if (submittedDateTime > dueDateTime) {
          return true;
        }
      }

      return false;
    }).length;

    return {
      assignments,
      gradeStats: {
        overall_grade: overallGradePercentage,
        missing_work: missingWorkCount,
        attendance: Math.floor(Math.random() * 101),
      },
    };
  }

  async findUpcomingPosts(
    classroomId: string,
    userId: string,
    isStudent: boolean,
  ) {
    const filters = [
      eq(classroomPost.classroomId, classroomId),
      eq(classroomPost.type, 'assignment'),
      gte(
        sql<string>`(${classroomPost.assignmentData}->>'dueDate')::timestamp with time zone`,
        sql`now()`,
      ),
    ];

    if (isStudent) {
      filters.push(
        notExists(
          this.db
            .select()
            .from(assignmentSubmission)
            .where(
              and(
                eq(assignmentSubmission.postId, classroomPost.id),
                eq(assignmentSubmission.studentId, userId),
                sql`${assignmentSubmission.status} != 'assigned'`,
              ),
            ),
        ),
      );
    }

    const posts = await this.db
      .select({
        id: classroomPost.id,
        title: classroomPost.title,
        type: classroomPost.type,
        dueAt: sql<string>`${classroomPost.assignmentData}->>'dueDate'`,
      })
      .from(classroomPost)
      .where(and(...filters))
      .orderBy(sql`${classroomPost.assignmentData}->>'dueDate' asc`);

    return posts;
  }

  async findJoinedClassrooms(userId: string) {
    const classrooms = await this.db.query.classroom.findMany({
      where: and(
        or(
          eq(classroom.teacherId, userId),
          exists(
            this.db
              .select()
              .from(classroomMembers)
              .where(
                and(
                  eq(classroomMembers.classroomId, classroom.id),
                  eq(classroomMembers.studentId, userId),
                ),
              ),
          ),
        ),
      ),
    });

    return classrooms;
  }

  async getAllStudentsGradeStats(classroomId: string) {
    const members: { studentId: string; studentName: string | null }[] =
      await this.db
        .select({
          studentId: classroomMembers.studentId,
          studentName: user.name,
        })
        .from(classroomMembers)
        .innerJoin(user, eq(classroomMembers.studentId, user.id))
        .where(eq(classroomMembers.classroomId, classroomId));

    const assignments = await this.db.query.classroomPost.findMany({
      where: and(
        eq(classroomPost.classroomId, classroomId),
        eq(classroomPost.type, 'assignment'),
      ),
      with: {
        submissions: true,
      },
    });

    const studentStats = new Map<
      string,
      { name: string; earned: number; possible: number; missing: number }
    >();

    for (const member of members) {
      studentStats.set(member.studentId, {
        name: member.studentName ?? member.studentId,
        earned: 0,
        possible: 0,
        missing: 0,
      });
    }

    for (const assignment of assignments) {
      const maxPoints = assignment.assignmentData?.points || 0;
      const dueDate = assignment.assignmentData?.dueDate;

      for (const member of members) {
        const submission = assignment.submissions.find(
          (s) => s.studentId === member.studentId,
        );
        const stats = studentStats.get(member.studentId)!;

        if (
          submission &&
          submission.status === 'graded' &&
          submission.grade !== null &&
          maxPoints > 0
        ) {
          stats.earned += submission.grade;
          stats.possible += maxPoints;
        } else if (maxPoints > 0) {
          stats.possible += maxPoints;
        }

        if (dueDate) {
          const dueDateTime = new Date(dueDate).getTime();
          const now = new Date().getTime();
          if (dueDateTime < now && (!submission || !submission.submittedAt)) {
            stats.missing++;
          } else if (
            submission?.submittedAt &&
            new Date(submission.submittedAt).getTime() > dueDateTime
          ) {
            stats.missing++;
          }
        }
      }
    }

    return Array.from(studentStats.entries()).map(([studentId, data]) => ({
      studentId,
      name: data.name,
      overall_grade:
        data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
      missing_work: data.missing,
    }));
  }

  async getStudentGradeDetails(classroomId: string, studentId: string) {
    const student = await this.db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, studentId))
      .then((res) => res[0]);

    const assignments = await this.db.query.classroomPost.findMany({
      where: and(
        eq(classroomPost.classroomId, classroomId),
        eq(classroomPost.type, 'assignment'),
      ),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    const submissions = await this.db
      .select()
      .from(assignmentSubmission)
      .where(
        and(
          eq(assignmentSubmission.studentId, studentId),
          inArray(
            assignmentSubmission.postId,
            assignments.map((a) => a.id),
          ),
        ),
      );

    const submissionMap = new Map<string, (typeof submissions)[0]>();
    for (const sub of submissions) {
      submissionMap.set(sub.postId, sub);
    }

    let totalEarnedPoints = 0;
    let totalPossiblePoints = 0;
    let missingWorkCount = 0;

    const assignmentDetails = assignments.map((assignment) => {
      const submission = submissionMap.get(assignment.id);
      const maxPoints = assignment.assignmentData?.points || 0;
      const dueDate = assignment.assignmentData?.dueDate;

      let grade: number | null = null;
      let feedback: string | null = null;
      let status = 'not_started';
      let percentage: number | null = null;

      if (submission) {
        status = submission.status;
        if (submission.status === 'graded' && submission.grade !== null) {
          grade = submission.grade;
          feedback = submission.feedback ?? null;
          percentage =
            maxPoints > 0
              ? Math.round((submission.grade / maxPoints) * 100)
              : null;
          totalEarnedPoints += submission.grade;
          totalPossiblePoints += maxPoints;
        } else if (maxPoints > 0) {
          totalPossiblePoints += maxPoints;
        }
      }

      if (dueDate) {
        const dueDateTime = new Date(dueDate).getTime();
        const now = new Date().getTime();
        if (dueDateTime < now && (!submission || !submission.submittedAt)) {
          missingWorkCount++;
        } else if (
          submission?.submittedAt &&
          new Date(submission.submittedAt).getTime() > dueDateTime
        ) {
          missingWorkCount++;
        }
      }

      return {
        title: assignment.title,
        grade,
        maxPoints,
        percentage,
        feedback,
        status,
        dueDate: dueDate ?? null,
      };
    });

    const overallGradePercentage =
      totalPossiblePoints > 0
        ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100)
        : 0;

    return {
      studentName: student?.name ?? studentId,
      overall_grade: overallGradePercentage,
      missing_work: missingWorkCount,
      assignments: assignmentDetails,
    };
  }
}
