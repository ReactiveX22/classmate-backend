import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { user } from 'src/database/schema';

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
}
