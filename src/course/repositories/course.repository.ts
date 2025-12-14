import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { course } from 'src/database/schema';

@Injectable()
export class CourseRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(course)
      .where(eq(course.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByCode(code: string) {
    const result = await this.db
      .select()
      .from(course)
      .where(eq(course.code, code))
      .limit(1);
    return result[0] || null;
  }

  async findByCodeAndSemester(code: string, semester: string) {
    const result = await this.db
      .select()
      .from(course)
      .where(and(eq(course.code, code), eq(course.semester, semester as any)))
      .limit(1);
    return result[0] || null;
  }

  async findByTeacherId(teacherId: string) {
    return this.db.select().from(course).where(eq(course.teacherId, teacherId));
  }

  async findBySemester(semester: string) {
    return this.db
      .select()
      .from(course)
      .where(eq(course.semester, semester as any));
  }

  async create(data: {
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

  async update(id: string, data: Partial<typeof course.$inferInsert>) {
    const [updated] = await this.db
      .update(course)
      .set(data)
      .where(eq(course.id, id))
      .returning();
    return updated || null;
  }

  async assignTeacher(courseId: string, teacherId: string) {
    return this.update(courseId, { teacherId });
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(course)
      .where(eq(course.id, id))
      .returning();
    return deleted || null;
  }
}
