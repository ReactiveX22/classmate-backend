import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroomMembers, student, user } from 'src/database/schema';
import {
  attendance,
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
}
