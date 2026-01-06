import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import {
  ApplicationBadRequestException,
  ApplicationForbiddenException,
} from 'src/common/exceptions/application.exception';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { ClassroomService } from './classroom.service';

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
}
