import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import * as classroomSchema from 'src/database/schema/classroom-schema';
import type { CourseSeed, ClassroomSeed } from 'src/database/seed/seed';

const CLASSROOMS_PATH = '../data/classrooms.json';

const generateClassCode = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 7);

interface ClassroomData {
  teacherUserId: string;
  name: string;
  section: string;
  description: string;
}

export async function seedClassrooms(
  db: NodePgDatabase<any>,
  courses: CourseSeed[],
): Promise<ClassroomSeed[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const classroomsData = require(CLASSROOMS_PATH) as ClassroomData[];

  const classroomInserts = classroomsData.map((c, i) => ({
    courseId: courses[i].id,
    teacherId: c.teacherUserId,
    name: c.name,
    section: c.section,
    classCode: generateClassCode(),
    description: c.description,
    status: 'active' as const,
  }));

  const inserted = await db
    .insert(classroomSchema.classroom)
    .values(classroomInserts)
    .onConflictDoNothing({
      target: classroomSchema.classroom.classCode,
    })
    .returning({
      id: classroomSchema.classroom.id,
      classCode: classroomSchema.classroom.classCode,
    });

  let results = inserted;
  if (inserted.length === 0) {
    results = await db
      .select({
        id: classroomSchema.classroom.id,
        classCode: classroomSchema.classroom.classCode,
      })
      .from(classroomSchema.classroom);
  }

  console.log(`  upserted ${results.length} classrooms`);

  return results.map((r) => ({ id: r.id, classCode: r.classCode ?? '' }));
}
