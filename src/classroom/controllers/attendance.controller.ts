import {
  Body,
  Controller,
  Get,
  Param,
  ParseDatePipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  BulkCreateAttendanceDto,
  CreateAttendanceDto,
} from '../dto/create-attendance.dto';
import { AttendanceService } from '../services/attendance.service';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { type AppUserSession } from 'src/common/types/session.types';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';

@Controller('classrooms/:classroomId/attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('bulk')
  @Roles([AppRole.Instructor])
  async createBulk(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
    @Body() dto: BulkCreateAttendanceDto,
  ) {
    return await this.attendanceService.createBulk(
      classroomId,
      session.user.id,
      orgId,
      dto,
    );
  }

  @Get('/checklist')
  @Roles([AppRole.Instructor])
  async getChecklist(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
    @Query('date', new ParseDatePipe({ optional: true })) date?: string,
  ) {
    return await this.attendanceService.getChecklist(
      session.user.id,
      classroomId,
      orgId,
      date,
    );
  }

  @Get('/stats/:studentId')
  @Roles([AppRole.Instructor, AppRole.Student])
  async getStats(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('studentId') studentId: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.attendanceService.getStats(
      session,
      classroomId,
      orgId,
      studentId,
    );
  }
}
