import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { AttendanceService } from '../services/attendance.service';
import { Session } from '@thallesp/nestjs-better-auth';
import { type AppUserSession } from 'src/common/types/session.types';
import { OrganizationId } from 'src/common/decorators';

@Controller('classrooms/:classroomId/attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async create(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
    @Body() dto: CreateAttendanceDto,
  ) {
    return await this.attendanceService.create(
      classroomId,
      session.user.id,
      orgId,
      dto,
    );
  }
}
