import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';
import { course } from 'src/database/schema';

@Injectable()
export class CourseRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: {
    organizationId: string;
    teacherId?: string;
    code: string;
    title: string;
    description?: string;
    credits?: number;
    semester: string;
    maxStudents?: number;
  }) {
    const [created] = await this.db.insert(course).values(data).returning();
    return created;
  }
}
