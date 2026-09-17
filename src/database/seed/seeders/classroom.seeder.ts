import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as classroomSchema from 'src/database/schema/classroom-schema';
import type { CourseSeed, ClassroomSeed } from 'src/database/seed/seed';

const CLASSROOMS_PATH = '../data/classrooms.json';

interface ClassroomData {
  id: string;
  courseIndex: number;
  teacherUserId: string;
  name: string;
  section: string;
  classCode: string;
  description: string;
}

export async function seedClassrooms(
  db: NodePgDatabase<any>,
  courses: CourseSeed[],
): Promise<ClassroomSeed[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const classroomsData = require(CLASSROOMS_PATH) as ClassroomData[];

  // Fixed ids and class codes from JSON: re-runs hit the id conflict
  // target and insert nothing, so seeding stays idempotent.
  const classroomInserts = classroomsData.map((c) => ({
    id: c.id,
    courseId: courses[c.courseIndex].id,
    teacherId: c.teacherUserId,
    name: c.name,
    section: c.section,
    classCode: c.classCode,
    description: c.description,
    status: 'active' as const,
  }));

  await db
    .insert(classroomSchema.classroom)
    .values(classroomInserts)
    .onConflictDoNothing({ target: classroomSchema.classroom.id });

  // Always re-read and restore JSON order (by name + section) so member
  // mapping by index is stable on both fresh and repeat runs. The old code
  // relied on select order without ORDER BY, which Postgres does not promise.
  const rows = await db
    .select({
      id: classroomSchema.classroom.id,
      classCode: classroomSchema.classroom.classCode,
      name: classroomSchema.classroom.name,
      section: classroomSchema.classroom.section,
    })
    .from(classroomSchema.classroom);

  const byKey = new Map(rows.map((r) => [`${r.name}|${r.section ?? ''}`, r]));
  const results = classroomsData.map((c) => {
    const row = byKey.get(`${c.name}|${c.section}`);
    if (!row) {
      throw new Error(`Seeded classroom missing: ${c.name} ${c.section}`);
    }
    return { id: row.id, classCode: row.classCode ?? '' };
  });

  console.log(`  upserted ${results.length} classrooms`);

  return results;
}
