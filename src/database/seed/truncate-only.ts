import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from 'src/database/schema';
import { truncateAll } from './truncate';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  const db = drizzle(pool, { schema, logger: false });

  try {
    console.log('Truncating all tables...');
    await truncateAll(db);
    console.log('Done. Database is empty.');
  } catch (err) {
    console.error('Truncate failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
