import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import {
  ApplicationBadRequestException,
  ApplicationForbiddenException,
} from 'src/common/exceptions/application.exception';
import {
  BulkCreateAttendanceDto,
  CreateAttendanceDto,
} from '../dto/create-attendance.dto';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { ClassroomService } from './classroom.service';
import { AppRole } from 'src/common/enums/role.enum';
import { AppUserSession } from 'src/common/types/session.types';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly classroomService: ClassroomService,
  ) {}

  async create(
    classroomId: string,
    userId: string,
    orgId: string,
    dto: CreateAttendanceDto,
  ) {
    const classroom = await this.classroomService.findOne(classroomId, orgId);

    if (classroom.teacherId !== userId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to create attendance for this classroom',
        ERROR_CODES.ATTENDANCE.NOT_AUTHORIZED,
      );
    }

    const isMember = classroom.classroomMembers.some(
      (member) => member.studentId === dto.studentId,
    );
    if (!isMember) {
      throw new ApplicationBadRequestException(
        'Student is not a member of this classroom',
        ERROR_CODES.ATTENDANCE.NOT_MEMBER,
      );
    }

    const attendanceDate = dto.date || new Date().toISOString().split('T')[0];
    if (new Date(attendanceDate) > new Date()) {
      throw new ApplicationBadRequestException(
        'Cannot mark attendance for a future date',
        ERROR_CODES.ATTENDANCE.FUTURE_DATE,
      );
    }

    return await this.attendanceRepository.upsert({
      ...dto,
      classroomId,
      date: attendanceDate,
    });
  }

  async createBulk(
    classroomId: string,
    userId: string,
    orgId: string,
    dto: BulkCreateAttendanceDto,
  ) {
    const classroom = await this.classroomService.findOne(classroomId, orgId);
    if (classroom.teacherId !== userId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to manage this classroom',
        ERROR_CODES.ATTENDANCE.NOT_AUTHORIZED,
      );
    }

    if (new Date(dto.date) > new Date()) {
      throw new ApplicationBadRequestException(
        'Cannot mark attendance for a future date',
        ERROR_CODES.ATTENDANCE.FUTURE_DATE,
      );
    }

    const validStudentIds = new Set(
      classroom.classroomMembers.map((m) => m.studentId),
    );

    for (const record of dto.records) {
      if (!validStudentIds.has(record.studentId)) {
        throw new ApplicationBadRequestException(
          `Student ${record.studentId} is not a member of this classroom`,
          ERROR_CODES.ATTENDANCE.NOT_MEMBER,
        );
      }
    }

    const attendanceData = dto.records.map((record) => ({
      ...record,
      classroomId,
      date: dto.date,
    }));

    return await this.attendanceRepository.upsertBulk(attendanceData);
  }

  async getChecklist(
    userId: string,
    classroomId: string,
    orgId: string,
    date?: string,
  ) {
    const classroom = await this.classroomService.findOne(classroomId, orgId);

    if (classroom.teacherId !== userId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to view attendances for this classroom',
        ERROR_CODES.ATTENDANCE.NOT_AUTHORIZED,
      );
    }

    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const attendances = await this.attendanceRepository.getChecklist(
      classroomId,
      targetDate,
    );

    return attendances;
  }

  async getStats(
    session: AppUserSession,
    classroomId: string,
    orgId: string,
    studentId: string,
  ) {
    const classroom = await this.classroomService.findOne(classroomId, orgId);
    const { user } = session;

    if (user.role === AppRole.Instructor) {
      if (classroom.teacherId !== user.id) {
        throw new ApplicationForbiddenException(
          'You are not authorized to view attendance stats for this classroom',
          ERROR_CODES.ATTENDANCE.NOT_AUTHORIZED,
        );
      }
    } else if (user.role === AppRole.Student) {
      if (user.id !== studentId) {
        throw new ApplicationForbiddenException(
          'You can only view your own attendance statistics',
          ERROR_CODES.ATTENDANCE.NOT_AUTHORIZED,
        );
      }

      const isMember = classroom.classroomMembers.some(
        (m) => m.studentId === user.id,
      );
      if (!isMember) {
        throw new ApplicationForbiddenException(
          'You are not a member of this classroom',
          ERROR_CODES.ATTENDANCE.NOT_AUTHORIZED,
        );
      }
    }

    if (user.role === AppRole.Instructor) {
      const isTargetMember = classroom.classroomMembers.some(
        (m) => m.studentId === studentId,
      );
      if (!isTargetMember) {
        throw new ApplicationBadRequestException(
          'Student is not a member of this classroom',
          ERROR_CODES.ATTENDANCE.NOT_MEMBER,
        );
      }
    }

    const stats = await this.attendanceRepository.getStudentStats(
      classroomId,
      studentId,
    );

    const attendanceRate =
      stats.total > 0
        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
        : 0;

    return {
      ...stats,
      attendanceRate,
    };
  }
}
