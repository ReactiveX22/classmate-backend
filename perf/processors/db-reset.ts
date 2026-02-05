import { Pool } from 'pg';

async function resetDatabase() {
  const pool = new Pool({
    connectionString:
      'postgresql://postgres:password@localhost:5432/classmate-test',
  });

  console.log('--- 🧨 Nuking All Database Objects ---');
  try {
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop Tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS "public"."' || r.tablename || '" CASCADE';
        END LOOP;
        
        -- Drop Enums/Types (Drizzle uses these for pgEnum)
        FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS "public"."' || r.typname || '" CASCADE';
        END LOOP;
      END $$;
    `);

    console.log('✅ Database is now a blank slate.');
  } catch (err: any) {
    console.error('❌ Reset failed:', err.message);
  } finally {
    await pool.end();
  }
}

resetDatabase();
