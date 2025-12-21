import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { OrganizationId } from 'src/common/decorators';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { EnrollmentService } from '../services/enrollment.service';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  async create(
    @Body() dto: CreateEnrollmentDto,
    @OrganizationId() orgId: string,
  ) {
    return this.enrollmentService.createEnrollment(dto, orgId);
  }

  @Delete(':courseId/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @OrganizationId() orgId: string,
  ) {
    await this.enrollmentService.removeEnrollment(courseId, studentId, orgId);
  }
}
