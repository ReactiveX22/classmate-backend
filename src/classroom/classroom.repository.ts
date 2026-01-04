import { Injectable } from '@nestjs/common';
import { and, eq, exists, inArray, or, SQL } from 'drizzle-orm';
import {
  ClassroomPaginationConfig,
  ClassroomPostPaginationConfig,
} from 'src/classroom/classroom.config';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
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
}
