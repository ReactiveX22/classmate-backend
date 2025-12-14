import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { userProfile } from 'src/database/schema';

@Injectable()
export class UserProfileRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async findByUserId(userId: string) {
    const result = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);
    return result[0] || null;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(data: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    displayName: string;
    phone?: string;
    bio?: string;
  }) {
    const [created] = await this.db
      .insert(userProfile)
      .values(data)
      .returning();
    return created;
  }

  async update(id: string, data: Partial<typeof userProfile.$inferInsert>) {
    const [updated] = await this.db
      .update(userProfile)
      .set(data)
      .where(eq(userProfile.id, id))
      .returning();
    return updated || null;
  }

  async delete(id: string) {
    // Soft delete by setting deletedAt
    const [updated] = await this.db
      .update(userProfile)
      .set({ deletedAt: new Date() })
      .where(eq(userProfile.id, id))
      .returning();
    return updated || null;
  }
}

