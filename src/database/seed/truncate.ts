import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

const ALL_TABLES = [
  'organization',
  'user',
  'verification',
  'account',
  'session',
  'user_profile',
  'student',
  'teacher',
  'semester',
  'course_session',
  'course',
  'enrollment',
  'attendance',
  'assignment_submission',
  'classroom',
  'classroom_resource_bookmark',
  'classroom_post',
  'classroom_post_comment',
  'classroom_members',
  'notification',
  'notification_read',
  'notice',
  'todo',
  'import_jobs',
  'embedding_collections',
  'embedding_documents',
];

export async function truncateAll(db: NodePgDatabase<any>) {
  const result = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const existing = new Set(result.rows.map((r) => r.tablename));
  const toTruncate = ALL_TABLES.filter((t) => existing.has(t));

  if (toTruncate.length === 0) {
    console.log('  no tables found to truncate');
    return;
  }

  const tableList = toTruncate.map((t) => `"${t}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} CASCADE`));
  console.log(`  truncated ${toTruncate.length} tables`);
}
