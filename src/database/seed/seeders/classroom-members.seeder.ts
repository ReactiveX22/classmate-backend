import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as membersSchema from 'src/database/schema/classroom-members-schema';
import type { ClassroomSeed } from 'src/database/seed/seed';

const MEMBERS_PATH = '../data/classroom-members.json';

interface MembersData {
  classroomIndices: Record<string, string[]>;
}

export async function seedClassroomMembers(
  db: NodePgDatabase<any>,
  classrooms: ClassroomSeed[],
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require(MEMBERS_PATH) as MembersData;

  const inserts: Array<{
    classroomId: string;
    studentId: string;
  }> = [];

  for (const [indexStr, studentIds] of Object.entries(data.classroomIndices)) {
    const index = parseInt(indexStr, 10);
    if (index >= classrooms.length) continue;

    const classroomId = classrooms[index].id;
    for (const studentId of studentIds) {
      inserts.push({ classroomId, studentId });
    }
  }

  if (inserts.length > 0) {
    await db
      .insert(membersSchema.classroomMembers)
      .values(inserts)
      .onConflictDoNothing({
        target: [
          membersSchema.classroomMembers.classroomId,
          membersSchema.classroomMembers.studentId,
        ],
      });
  }

  console.log(`  created ${inserts.length} classroom memberships`);
}
