import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { organization } from 'src/database/schema';

export type CreateOrganizationInput = Omit<
  typeof organization.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class OrganizationRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findBySlug(slug: string) {
    const result = await this.db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);
    return result[0] || null;
  }

  async findAll() {
    return this.db.select().from(organization);
  }

  async create(data: CreateOrganizationInput) {
    const [created] = await this.db
      .insert(organization)
      .values(data)
      .returning();
    return created;
  }

  async update(id: string, data: Partial<typeof organization.$inferInsert>) {
    const [updated] = await this.db
      .update(organization)
      .set(data)
      .where(eq(organization.id, id))
      .returning();
    return updated || null;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(organization)
      .where(eq(organization.id, id))
      .returning();
    return deleted || null;
  }
}
