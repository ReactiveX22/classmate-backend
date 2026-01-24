import { Injectable } from '@nestjs/common';
import { and, eq, exists, inArray, or, SQL } from 'drizzle-orm';
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
  course,
  SelectClassroom,
} from 'src/database/schema';
import { PaginationService } from 'src/lib/pagination/pagination.service';

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
    const filters: SQL[] = [
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
    query: PaginationQueryDto,
    classroomId: string,
    isInstructor: boolean,
    userId?: string,
  ) {
    const filters: SQL[] = [eq(classroomPost.classroomId, classroomId)];

    return this.paginationService.paginate(
      {
        config: new ClassroomPostPaginationConfig(userId, isInstructor),
        filters,
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
}
