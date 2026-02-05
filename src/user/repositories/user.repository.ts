import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { student, teacher, user, userProfile } from 'src/database/schema';

@Injectable()
export class UserRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return result[0] || null;
  }

  async update(id: string, data: Partial<typeof user.$inferInsert>) {
    const [updated] = await this.db
      .update(user)
      .set(data)
      .where(eq(user.id, id))
      .returning();
    return updated || null;
  }

  async updateRole(id: string, role: string) {
    return this.update(id, { role });
  }

  async delete(id: string) {
    await this.db.delete(user).where(eq(user.id, id));
  }

  async findUserWithRelationships(userId: string) {
    const result = await this.db
      .select({
        userData: user,
        profileData: userProfile,
        teacherData: teacher,
        studentData: student,
      })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(teacher, eq(user.id, teacher.userId))
      .leftJoin(student, eq(user.id, student.userId))
      .where(eq(user.id, userId))
      .limit(1);

    if (!result[0]) return null;

    const { userData, profileData, teacherData, studentData } = result[0];

    return {
      ...userData,
      profile: profileData || null,
      teacher: teacherData || null,
      student: studentData || null,
    };
  }
}
