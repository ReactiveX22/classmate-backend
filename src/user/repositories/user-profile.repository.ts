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

  async create(data: typeof userProfile.$inferInsert) {
    const [created] = await this.db
      .insert(userProfile)
      .values(data)
      .returning();
    return created;
  }

  async save(data: typeof userProfile.$inferInsert) {
    const { userId, ...updateData } = data;

    // Filter out undefined values to avoid "No values to set" error in Drizzle
    const set = Object.fromEntries(
      Object.entries({
        phone: updateData.phone,
        bio: updateData.bio,
        skills: updateData.skills,
        achievements: updateData.achievements,
      }).filter(([_, v]) => v !== undefined),
    );

    if (Object.keys(set).length === 0) {
      // If nothing to update, just ensure it exists
      const [result] = await this.db
        .insert(userProfile)
        .values(data)
        .onConflictDoNothing()
        .returning();
      return result || (await this.findByUserId(userId));
    }

    const [result] = await this.db
      .insert(userProfile)
      .values(data)
      .onConflictDoUpdate({
        target: userProfile.userId,
        set,
      })
      .returning();
    return result;
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
