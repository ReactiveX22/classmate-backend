import { Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { createPaginatedResponse } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  StudentRepository,
  StudentWithProfile,
} from '../repositories/student.repository';
import {
  TeacherRepository,
  TeacherWithProfile,
} from '../repositories/teacher.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userProfileRepository: UserProfileRepository,
    private readonly teacherRepository: TeacherRepository,
    private readonly studentRepository: StudentRepository,
    @InjectDb() private readonly db: DB,
  ) {}

  async createTeacher(data: {
    userId: string;
    title?: string;
    joinDate?: string;
  }) {
    return this.teacherRepository.create(data);
  }

  async findTeacherByUserId(userId: string) {
    return this.teacherRepository.findByUserId(userId);
  }

  async findStudentByUserProfileId(userProfileId: string) {
    return this.studentRepository.findByUserProfileId(userProfileId);
  }

  async createStudent(data: { userProfileId: string; studentId?: string }) {
    return this.studentRepository.create(data);
  }

  async getStudentsByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<StudentWithProfile>> {
    const { students, total } = await this.studentRepository.findByOrganization(
      organizationId,
      query,
    );

    return createPaginatedResponse(students, query, total);
  }

  async getTeachersByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<TeacherWithProfile>> {
    const { meta, data } = await this.teacherRepository.findByOrganization(
      organizationId,
      query,
    );

    return { data, meta };
  }

  async getUserWithProfile(userId: string, role?: string) {
    const profile = await this.userProfileRepository.findByUserId(userId);

    if (!profile) {
      return {
        profile: null,
        teacher: null,
        student: null,
      };
    }

    // Determine if we need to fetch teacher/student data
    let userRole: string | undefined = role;
    if (!userRole) {
      const user = await this.userRepository.findById(userId);
      userRole = user?.role ?? undefined;
    }

    // For instructors, fetch teacher data
    const teacher =
      userRole === 'instructor'
        ? await this.teacherRepository.findByUserId(userId)
        : null;

    // For students, fetch student data
    let student: Awaited<
      ReturnType<typeof this.findStudentByUserProfileId>
    > | null = null;
    if (userRole === 'student') {
      const existingStudent = await this.findStudentByUserProfileId(profile.id);
      student = existingStudent || null;
    }

    return {
      profile,
      teacher,
      student,
    };
  }

  async updateUserOrg(userId: string, orgId: string) {
    this.userRepository.update(userId, {
      organizationId: orgId,
    });
  }

  async remove(userId: string) {
    await this.userRepository.delete(userId);
  }
}
