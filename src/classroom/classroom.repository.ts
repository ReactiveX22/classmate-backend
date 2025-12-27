import { Injectable } from '@nestjs/common';
import { and, eq, inArray, SQL } from 'drizzle-orm';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ClassroomPaginationConfig } from 'src/course/repositories/classroom.config';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  classroom,
  classroomMembers,
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

  async findAll(query: PaginationQueryDto, orgId: string) {
    const filters: SQL[] = [eq(course.organizationId, orgId)];
    // TODO: check role if admin then no filter, if teacher then filter by that user ID

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
}
