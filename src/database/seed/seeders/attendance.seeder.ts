import { and, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as attendanceSchema from 'src/database/schema/attendance-schema';
import type { ClassroomSeed } from 'src/database/seed/seed';

const MEMBERS_PATH = '../data/classroom-members.json';

interface MembersData {
  classroomIndices: Record<string, string[]>;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StatusOverride {
  /** Index into that classroom's session-date list. */
  dateIndex: number;
  status: Exclude<AttendanceStatus, 'present'>;
  remarks?: string;
}

/**
 * Which classrooms get attendance + on which weekdays (getDay numbers).
 * Index 0 = LLM lecture (Mon/Wed), index 1 = DSA (Tue/Thu).
 */
const MEETING_DAYS: Record<number, number[]> = {
  0: [1, 3],
  1: [2, 4],
};

/**
 * Deterministic non-present patterns. Everyone else is present.
 * Marcus (001), Emily (002), David (003) are deliberately all-present.
 */
const OVERRIDES: Record<number, Record<string, StatusOverride[]>> = {
  0: {
    // Ryan: the absence outlier (LLM-only student).
    usr_student_013: [
      { dateIndex: 1, status: 'absent' },
      {
        dateIndex: 3,
        status: 'absent',
        remarks: 'Emailed ahead — family trip',
      },
      {
        dateIndex: 4,
        status: 'late',
        remarks: 'Arrived 15 min late — bus delay',
      },
    ],
    // Ethan: struggling in both classes (mirrors his 45 on HW4).
    usr_student_005: [
      { dateIndex: 2, status: 'absent' },
      { dateIndex: 4, status: 'late', remarks: 'Arrived 10 min late' },
    ],
    // Mia: one absence (mirrors her missing Lab 2 reflection).
    usr_student_012: [
      {
        dateIndex: 3,
        status: 'absent',
        remarks: 'Interview trip — notified in advance',
      },
    ],
    // Grace: one late (mirrors her late reflection).
    usr_student_015: [
      { dateIndex: 2, status: 'late', remarks: 'Arrived 10 min late' },
    ],
    usr_student_004: [
      { dateIndex: 1, status: 'excused', remarks: "Doctor's note on file" },
    ],
    usr_student_007: [
      { dateIndex: 0, status: 'late', remarks: 'Arrived 10 min late' },
    ],
  },
  1: {
    usr_student_005: [
      { dateIndex: 3, status: 'absent' },
      { dateIndex: 5, status: 'late', remarks: 'Arrived 10 min late' },
    ],
    usr_student_009: [
      { dateIndex: 2, status: 'absent' },
      { dateIndex: 4, status: 'late', remarks: 'Arrived 10 min late' },
    ],
    usr_student_008: [
      { dateIndex: 2, status: 'excused', remarks: 'University-approved trip' },
    ],
    usr_student_007: [
      { dateIndex: 1, status: 'late', remarks: 'Arrived 10 min late' },
    ],
  },
};

/** Local YYYY-MM-DD (toISOString would shift a day in non-UTC zones). */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Session dates for a meeting pattern: 1st of the current month
 * through yesterday. Dynamic so get_attendances (which defaults to
 * the current month) never comes back empty.
 */
function sessionDates(meetingDays: number[]): string[] {
  const now = new Date();
  const dates: string[] = [];
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  while (d <= yesterday) {
    if (meetingDays.includes(d.getDay())) {
      dates.push(toLocalDateString(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export async function seedAttendance(
  db: NodePgDatabase<any>,
  classrooms: ClassroomSeed[],
): Promise<{ inserted: number; skipped: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const membersData = require(MEMBERS_PATH) as MembersData;

  const targets = Object.entries(MEETING_DAYS)
    .map(([indexStr, days]) => {
      const index = parseInt(indexStr, 10);
      if (index >= classrooms.length) return null;
      const studentIds = membersData.classroomIndices[indexStr] ?? [];
      return {
        classroomId: classrooms[index].id,
        studentIds,
        dates: sessionDates(days),
        overrides: OVERRIDES[index] ?? {},
      };
    })
    .filter((t) => t !== null);

  const classroomIds = targets.map((t) => t.classroomId);
  if (classroomIds.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const existing = await db
    .select({
      classroomId: attendanceSchema.attendance.classroomId,
      studentId: attendanceSchema.attendance.studentId,
      date: attendanceSchema.attendance.date,
    })
    .from(attendanceSchema.attendance)
    .where(and(inArray(attendanceSchema.attendance.classroomId, classroomIds)));
  const existingKeys = new Set(
    existing.map((e) => `${e.classroomId}|${e.studentId}|${e.date}`),
  );

  const values: Array<typeof attendanceSchema.attendance.$inferInsert> = [];
  let skipped = 0;

  for (const target of targets) {
    for (const studentId of target.studentIds) {
      const overrides = target.overrides[studentId] ?? [];
      const byDate = new Map(
        overrides
          .filter((o) => o.dateIndex < target.dates.length)
          .map((o) => [target.dates[o.dateIndex], o]),
      );
      for (const date of target.dates) {
        const key = `${target.classroomId}|${studentId}|${date}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        const override = byDate.get(date);
        values.push({
          classroomId: target.classroomId,
          studentId,
          date,
          status: override?.status ?? 'present',
          remarks: override?.remarks ?? null,
        });
        // Guard against dupes within one run.
        existingKeys.add(key);
      }
    }
  }

  if (values.length > 0) {
    await db
      .insert(attendanceSchema.attendance)
      .values(values)
      .onConflictDoNothing({
        target: [
          attendanceSchema.attendance.studentId,
          attendanceSchema.attendance.date,
          attendanceSchema.attendance.classroomId,
        ],
      });
  }

  console.log(`  attendance: ${values.length} inserted, ${skipped} skipped`);
  return { inserted: values.length, skipped };
}
