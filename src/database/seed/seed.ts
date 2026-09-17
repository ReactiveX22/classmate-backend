import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from 'src/database/schema';
import { truncateAll } from './truncate';
import {
  seedOrganizations,
  linkAdminToOrg,
} from './seeders/organization.seeder';
import { seedUsers } from './seeders/user.seeder';
import { seedSemestersAndSessions } from './seeders/semester-session.seeder';
import { seedCourses } from './seeders/course.seeder';
import { seedClassrooms } from './seeders/classroom.seeder';
import { seedClassroomMembers } from './seeders/classroom-members.seeder';
import { seedNotices } from './seeders/notice.seeder';

export interface OrganizationSeed {
  id: string;
  slug: string;
}

export interface SemesterSeed {
  id: string;
  ordinal: string;
}

export interface SessionSeed {
  id: string;
  name: string;
}

export interface CourseSeed {
  id: string;
  code: string;
}

export interface ClassroomSeed {
  id: string;
  classCode: string;
}

const FRESH = process.argv.includes('--fresh');

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
    if (FRESH) {
      console.log('\n--- Truncating all tables ---');
      await truncateAll(db);
      console.log('  done');
    }

    console.log('\n--- Seeding organization ---');
    const orgs = await seedOrganizations(db);
    const org = orgs[0];

    console.log(
      '\n--- Seeding users, accounts, teachers, students, profiles ---',
    );
    await seedUsers(db, org.id);

    console.log('\n--- Linking admin to organization ---');
    await linkAdminToOrg(db, org.id);

    console.log('\n--- Seeding semesters and course sessions ---');
    const { semesters, sessions } = await seedSemestersAndSessions(db, org.id);

    console.log('\n--- Seeding courses ---');
    const courses = await seedCourses(db, org.id, semesters, sessions);

    console.log('\n--- Seeding classrooms ---');
    const classrooms = await seedClassrooms(db, courses);

    console.log('\n--- Seeding classroom members ---');
    await seedClassroomMembers(db, classrooms);

    console.log('\n--- Seeding notices and notifications ---');
    const noticeCount = await seedNotices(db, org.id);

    console.log('\n--- Seed complete ---');
    console.log(`  Organization: ${org.slug} (${org.id})`);
    console.log(`  Users: 1 admin + 7 teachers + 16 students = 24`);
    console.log(`  Courses: ${courses.length}`);
    console.log(`  Classrooms: ${classrooms.length}`);
    console.log(`  Notices: ${noticeCount}`);
    console.log(`  Password for all accounts: "password123"`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
