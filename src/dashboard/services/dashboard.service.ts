import { Injectable } from '@nestjs/common';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { StudentRepository } from 'src/user/repositories/student.repository';
import { TeacherRepository } from 'src/user/repositories/teacher.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly teacherRepository: TeacherRepository,
    private readonly courseRepository: CourseRepository,
  ) {}

  async getAdminStats(organizationId: string) {
    const [studentsCount, teachersCount, coursesCount] = await Promise.all([
      this.studentRepository.countByOrganization(organizationId),
      this.teacherRepository.countByOrganization(organizationId),
      this.courseRepository.countByOrganization(organizationId),
    ]);

    return {
      studentsCount,
      teachersCount,
      coursesCount,
    };
  }
}
