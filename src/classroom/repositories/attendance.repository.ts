import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';
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
}
