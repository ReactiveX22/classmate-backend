import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { type DB, InjectDb, Transaction } from 'src/database/db.provider';
import { course, enrollment, student, user } from 'src/database/schema';

@Injectable()
export class EnrollmentRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async runInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return await this.db.transaction(callback);
  }

  async verifyOrg(
    tx: Transaction,
    orgId: string,
    courseId: string,
    studentId: string,
  ) {
    const [courseData, studentData] = await Promise.all([
      // Check Course Org
      tx
        .select()
        .from(course)
        .where(and(eq(course.id, courseId), eq(course.organizationId, orgId)))
        .limit(1),

      // Check Student Org (via User)
      tx
        .select()
        .from(student)
        .innerJoin(user, eq(student.userId, user.id))
        .where(and(eq(student.id, studentId), eq(user.organizationId, orgId)))
        .limit(1),
    ]);

    return {
      courseMatch: courseData[0],
      studentMatch: studentData[0],
    };
  }

  async insert(tx: Transaction, courseId: string, studentId: string) {
    return await tx
      .insert(enrollment)
      .values({ courseId, studentId })
      .returning();
  }
}
