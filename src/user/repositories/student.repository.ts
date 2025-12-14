import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { student } from 'src/database/schema';

@Injectable()
export class StudentRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: { userProfileId: string; studentId?: string }) {
    const newStudent = await this.db
      .insert(student)
      .values({
        userProfileId: data.userProfileId,
        studentId: data.studentId,
      })
      .returning();

    return newStudent[0];
  }

  async findByUserProfileId(userProfileId: string) {
    const result = await this.db.query.student.findFirst({
      where: eq(student.userProfileId, userProfileId),
    });

    return result;
  }
}
