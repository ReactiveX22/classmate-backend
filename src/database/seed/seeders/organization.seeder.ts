import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as orgSchema from 'src/database/schema/organization-schema';
import * as authSchema from 'src/database/schema/auth-schema';
import type { OrganizationSeed } from 'src/database/seed/seed';

const DATA_PATH = '../data/organizations.json';

export async function seedOrganizations(
  db: NodePgDatabase<any>,
): Promise<OrganizationSeed[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require(DATA_PATH) as Array<{
    name: string;
    slug: string;
    type: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  }>;

  const results: OrganizationSeed[] = [];

  for (const item of raw) {
    // Idempotent: skip if slug exists
    const existing = await db
      .select()
      .from(orgSchema.organization)
      .where(eq(orgSchema.organization.slug, item.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  org "${item.name}" already exists, skipping`);
      results.push({ id: existing[0].id, slug: existing[0].slug });
      continue;
    }

    const [inserted] = await db
      .insert(orgSchema.organization)
      .values(item)
      .returning({
        id: orgSchema.organization.id,
        slug: orgSchema.organization.slug,
      });

    results.push({ id: inserted.id, slug: inserted.slug });
    console.log(`  created org "${item.name}" (${inserted.id})`);
  }

  return results;
}

/**
 * Link admin user to the organization.
 */
export async function linkAdminToOrg(
  db: NodePgDatabase<any>,
  orgId: string,
) {
  const adminId = 'usr_admin_001';
  await db
    .update(authSchema.user)
    .set({ organizationId: orgId })
    .where(eq(authSchema.user.id, adminId));
  console.log(`  linked admin to org ${orgId}`);
}
