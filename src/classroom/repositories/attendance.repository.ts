import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroomMembers, student, user } from 'src/database/schema';
import {
  attendance,
  ATTENDANCE_STATUS,
  InsertAttendance,
} from 'src/database/schema/attendance-schema';

@Injectable()
export class AttendanceRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async upsert(data: InsertAttendance) {
    const [result] = await this.db
      .insert(attendance)
      .values(data)
      .onConflictDoUpdate({
        target: [attendance.classroomId, attendance.studentId, attendance.date],
        set: {
          status: data.status,
          remarks: data.remarks,
        },
      })
      .returning();

    return result;
  }

  async upsertBulk(data: InsertAttendance[]) {
    return await this.db
      .insert(attendance)
      .values(data)
      .onConflictDoUpdate({
        target: [attendance.classroomId, attendance.studentId, attendance.date],
        set: {
          status: sql`EXCLUDED.status`,
          remarks: sql`EXCLUDED.remarks`,
        },
      })
      .returning();
  }

  async getChecklist(classroomId: string, date: string) {
    const checklist = await this.db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        studentId: student.studentId,

        attendanceId: attendance.id,
        status: attendance.status,
        remarks: attendance.remarks,
      })
      .from(classroomMembers)
      .innerJoin(user, eq(classroomMembers.studentId, user.id))
      .leftJoin(student, eq(user.id, student.userId))
      .leftJoin(
        attendance,
        and(
          eq(attendance.studentId, user.id),
          eq(attendance.classroomId, classroomId),
          eq(attendance.date, date),
        ),
      )
      .where(eq(classroomMembers.classroomId, classroomId));

    return checklist;
  }

  async getStudentStats(classroomId: string, studentId: string) {
    const stats = await this.db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.classroomId, classroomId),
          eq(attendance.studentId, studentId),
        ),
      )
      .groupBy(attendance.status);

    const result = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      if (stat.status === ATTENDANCE_STATUS.PRESENT)
        result.present = stat.count;
      else if (stat.status === ATTENDANCE_STATUS.LATE) result.late = stat.count;
      else if (stat.status === ATTENDANCE_STATUS.ABSENT)
        result.absent = stat.count;
      else if (stat.status === ATTENDANCE_STATUS.EXCUSED)
        result.excused = stat.count;
      result.total += stat.count;
    });

    return result;
  }

  async getMonthlyAttendance(
    classroomId: string,
    studentId?: string,
    year?: number,
    month?: number,
  ) {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const conditions = [
      eq(attendance.classroomId, classroomId),
      sql`${attendance.date} >= ${startDate}`,
      sql`${attendance.date} <= ${endDate}`,
    ];

    if (studentId) {
      conditions.push(eq(attendance.studentId, studentId));
    }

    const records = await this.db
      .select({
        studentId: attendance.studentId,
        studentName: user.name,
        date: attendance.date,
        status: attendance.status,
        remarks: attendance.remarks,
      })
      .from(attendance)
      .innerJoin(user, eq(attendance.studentId, user.id))
      .where(and(...conditions))
      .orderBy(attendance.date, user.name);

    return records;
  }
}
