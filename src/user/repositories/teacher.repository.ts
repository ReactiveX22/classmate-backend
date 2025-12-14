import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { teacher } from 'src/database/schema';

@Injectable()
export class TeacherRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async findByUserProfileId(userProfileId: string) {
    const result = await this.db
      .select()
      .from(teacher)
      .where(eq(teacher.userProfileId, userProfileId))
      .limit(1);
    return result[0] || null;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(teacher)
      .where(eq(teacher.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(data: {
    userProfileId: string;
    title: 'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Lecturer' | 'Instructor';
    joinDate: string;
  }) {
    const [created] = await this.db.insert(teacher).values(data).returning();
    return created;
  }

  async update(id: string, data: Partial<typeof teacher.$inferInsert>) {
    const [updated] = await this.db
      .update(teacher)
      .set(data)
      .where(eq(teacher.id, id))
      .returning();
    return updated || null;
  }
}

