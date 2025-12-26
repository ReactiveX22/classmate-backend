import { Injectable } from '@nestjs/common';
import { eq, SQL } from 'drizzle-orm';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroom, course, SelectClassroom } from 'src/database/schema';
import { ClassroomPaginationConfig } from 'src/course/repositories/classroom.config';
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
}
