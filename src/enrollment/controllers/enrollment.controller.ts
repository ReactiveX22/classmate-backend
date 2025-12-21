import { Body, Controller, Post } from '@nestjs/common';
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
}
