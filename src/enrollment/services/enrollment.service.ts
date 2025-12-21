import { Injectable } from '@nestjs/common';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { ApplicationNotFoundException } from 'src/common/exceptions/application.exception';

@Injectable()
export class EnrollmentService {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  async createEnrollment(dto: CreateEnrollmentDto, orgId: string) {
    return await this.enrollmentRepository.runInTransaction(async (tx) => {
      const { courseMatch, studentMatch } =
        await this.enrollmentRepository.verifyOrg(
          tx,
          orgId,
          dto.courseId,
          dto.studentId,
        );

      if (!courseMatch || !studentMatch) {
        throw new ApplicationNotFoundException(
          'Course or Student not found in the organization',
        );
      }

      return await this.enrollmentRepository.insert(
        tx,
        dto.courseId,
        dto.studentId,
      );
    });
  }

  async removeEnrollment(courseId: string, studentId: string, orgId: string) {
    return await this.enrollmentRepository.runInTransaction(async (tx) => {
      const { courseMatch, studentMatch } =
        await this.enrollmentRepository.verifyOrg(
          tx,
          orgId,
          courseId,
          studentId,
        );

      if (!courseMatch || !studentMatch) {
        throw new ApplicationNotFoundException(
          'Course or Student not found in the organization',
        );
      }

      const result = await this.enrollmentRepository.remove(
        tx,
        courseId,
        studentId,
      );

      if (result.length === 0) {
        throw new ApplicationNotFoundException('Enrollment not found');
      }

      return result[0];
    });
  }
}
