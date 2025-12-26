import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroom } from 'src/database/schema';

@Injectable()
export class ClassroomRepository {
  constructor(@InjectDb() private readonly db: DB) {}

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
}
