import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as courseSchema from 'src/database/schema/course-schema';
import type {
  SemesterSeed,
  SessionSeed,
  CourseSeed,
} from 'src/database/seed/seed';

const COURSES_PATH = '../data/courses.json';

interface CourseData {
  teacherUserId: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  maxStudents: number;
  semesterOrdinal: string;
}

export async function seedCourses(
  db: NodePgDatabase<any>,
  orgId: string,
  semesters: SemesterSeed[],
  sessions: SessionSeed[],
): Promise<CourseSeed[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const coursesData = require(COURSES_PATH) as CourseData[];

  const currentSession = sessions.find(
    (s) => s.name.includes('Fall') || s.name.includes('Spring'),
  );

  const courseInserts = coursesData.map((c) => {
    const semester = semesters.find((s) => s.ordinal === c.semesterOrdinal);
    return {
      organizationId: orgId,
      teacherId: c.teacherUserId,
      sessionId: currentSession?.id,
      semesterId: semester?.id,
      code: c.code,
      title: c.title,
      description: c.description,
      credits: c.credits,
      maxStudents: c.maxStudents,
      status: 'active' as const,
    };
  });

  const inserted = await db
    .insert(courseSchema.course)
    .values(courseInserts)
    .onConflictDoNothing({
      target: [courseSchema.course.code, courseSchema.course.organizationId],
    })
    .returning({ id: courseSchema.course.id, code: courseSchema.course.code });

  let results = inserted;
  if (inserted.length === 0) {
    results = await db
      .select({ id: courseSchema.course.id, code: courseSchema.course.code })
      .from(courseSchema.course)
      .where(eq(courseSchema.course.organizationId, orgId));
  }

  console.log(`  upserted ${results.length} courses`);

  return results.map((r) => ({ id: r.id, code: r.code }));
}
