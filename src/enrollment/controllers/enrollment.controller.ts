import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { InvalidateCache } from 'src/cache/decorators/invalidate-cache.decorator';
import { TenantCacheInterceptor } from 'src/cache/interceptors/tenant-cache.interceptor';
import { OrganizationId } from 'src/common/decorators';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { EnrollmentService } from '../services/enrollment.service';

@Controller('enrollments')
@UseInterceptors(TenantCacheInterceptor)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @InvalidateCache('courses')
  async create(
    @Body() dto: CreateEnrollmentDto,
    @OrganizationId() orgId: string,
  ) {
    return this.enrollmentService.createEnrollment(dto, orgId);
  }

  @Delete(':courseId/:studentId')
  @InvalidateCache('courses')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @OrganizationId() orgId: string,
  ) {
    await this.enrollmentService.removeEnrollment(courseId, studentId, orgId);
  }
}
