import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as semesterSchema from 'src/database/schema/semester-schema';
import * as sessionSchema from 'src/database/schema/session-schema';
import { getSemesters } from 'src/database/seed/date-utils';
import type { SemesterSeed, SessionSeed } from 'src/database/seed/seed';

const SEMESTER_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export async function seedSemestersAndSessions(
  db: NodePgDatabase<any>,
  orgId: string,
): Promise<{ semesters: SemesterSeed[]; sessions: SessionSeed[] }> {
  const [currentInfo, previousInfo] = getSemesters();

  // Determine current semester ordinal based on academic year progress
  // 1st-2nd = year 1, 3rd-4th = year 2, 5th-6th = year 3, 7th-8th = year 4
  const now = new Date();
  const month = now.getMonth(); // 0-11
  // Fall (Aug-Dec) = odd semesters (1st, 3rd, 5th, 7th)
  // Spring (Jan-May) = even semesters (2nd, 4th, 6th, 8th)
  const academicYear = month >= 7 ? now.getFullYear() - 2023 : now.getFullYear() - 2024;
  const yearSlot = Math.min(Math.max(academicYear, 0), 3); // 0-3
  const isFall = month >= 7;
  const currentOrdinalIndex = yearSlot * 2 + (isFall ? 0 : 1);
  const currentOrdinal = SEMESTER_ORDINALS[Math.min(currentOrdinalIndex, 7)];

  // --- Semesters ---
  const semesterInserts = SEMESTER_ORDINALS.map((ordinal) => ({
    organizationId: orgId,
    ordinal,
    name: `${ordinal} Semester`,
  }));

  const semesters = await db
    .insert(semesterSchema.semester)
    .values(semesterInserts)
    .onConflictDoNothing({
      target: [
        semesterSchema.semester.ordinal,
        semesterSchema.semester.organizationId,
      ],
    })
    .returning({
      id: semesterSchema.semester.id,
      ordinal: semesterSchema.semester.ordinal,
    });

  let semesterResults = semesters;
  if (semesters.length === 0) {
    semesterResults = await db
      .select({
        id: semesterSchema.semester.id,
        ordinal: semesterSchema.semester.ordinal,
      })
      .from(semesterSchema.semester)
      .where(eq(semesterSchema.semester.organizationId, orgId));
  }

  console.log(`  upserted ${semesterResults.length} semesters (current: ${currentOrdinal})`);

  // --- Course Sessions ---
  const sessionInserts = [
    {
      organizationId: orgId,
      name: currentInfo.sessionName,
      description: `${currentInfo.semesterName} at StarLight University`,
      startDate: currentInfo.startDate,
      endDate: currentInfo.endDate,
      isCurrent: currentInfo.isCurrent,
    },
    {
      organizationId: orgId,
      name: previousInfo.sessionName,
      description: `${previousInfo.semesterName} at StarLight University`,
      startDate: previousInfo.startDate,
      endDate: previousInfo.endDate,
      isCurrent: false,
    },
  ];

  const sessions = await db
    .insert(sessionSchema.courseSession)
    .values(sessionInserts)
    .onConflictDoNothing({
      target: [
        sessionSchema.courseSession.name,
        sessionSchema.courseSession.organizationId,
      ],
    })
    .returning({
      id: sessionSchema.courseSession.id,
      name: sessionSchema.courseSession.name,
    });

  let sessionResults = sessions;
  if (sessions.length === 0) {
    sessionResults = await db
      .select({
        id: sessionSchema.courseSession.id,
        name: sessionSchema.courseSession.name,
      })
      .from(sessionSchema.courseSession)
      .where(eq(sessionSchema.courseSession.organizationId, orgId));
  }

  console.log(`  upserted ${sessionResults.length} course sessions`);

  const semesterSeeds: SemesterSeed[] = semesterResults.map((s) => ({
    id: s.id,
    ordinal: s.ordinal,
  }));

  const sessionSeeds: SessionSeed[] = sessionResults.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return { semesters: semesterSeeds, sessions: sessionSeeds };
}
