import { Module } from '@nestjs/common';
import { EnrollmentService } from './services/enrollment.service';
import { EnrollmentController } from './controllers/enrollment.controller';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [EnrollmentService, EnrollmentRepository],
  controllers: [EnrollmentController],
})
export class EnrollmentModule {}
