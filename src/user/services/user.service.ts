import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { createPaginatedResponse } from 'src/common/helpers/pagination.helper';
import { type DB, InjectDb } from 'src/database/db.provider';
import { user, userProfile } from 'src/database/schema';
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
import { CreateTeacherDto } from '../dto/create-teacher.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userProfileRepository: UserProfileRepository,
    private readonly teacherRepository: TeacherRepository,
    private readonly studentRepository: StudentRepository,
    @InjectDb() private readonly db: DB,
  ) {}

  async findUserById(id: string) {
    return this.userRepository.findById(id);
  }

  async findUserByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async updateUserRole(userId: string, role: string) {
    return this.userRepository.updateRole(userId, role);
  }

  async createUserWithProfile(data: {
    userId: string;
    name: string;
    email: string;
    role?: string;
    organizationId?: string;
    status?: 'active' | 'pending' | 'suspended';
    profile: {
      firstName: string;
      lastName: string;
      displayName: string;
      phone?: string;
      bio?: string;
    };
  }) {
    // Use transaction to ensure atomicity
    return this.db.transaction(async (tx) => {
      // If organizationId or status is provided, update the user record
      if (data.organizationId || data.status) {
        await tx
          .update(user) // user imported from schema
          .set({
            organizationId: data.organizationId,
            status: data.status,
          })
          .where(eq(user.id, data.userId));
      }

      const profile = await tx
        .insert(userProfile)
        .values({
          userId: data.userId,
          phone: data.profile.phone,
          bio: data.profile.bio,
        })
        .returning();

      return profile[0];
    });
  }

  async createTeacher(data: {
    userId: string;
    title?: string;
    joinDate?: string;
  }) {
    return this.teacherRepository.create(data);
  }

  async findUserProfileByUserId(userId: string) {
    return this.userProfileRepository.findByUserId(userId);
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

  /**
   * Get paginated students for an organization.
   * Used by admins to view all students in their organization.
   */
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

  /**
   * Fetches user with profile and role-specific data (teacher info for instructors)
   * @param userId - The user ID
   * @param role - Optional user role. If provided, skips user lookup for role check
   * @returns Object containing profile and teacher data (if instructor)
   */
  async getUserWithProfile(
    userId: string,
    role?: string,
  ): Promise<{
    profile: Awaited<ReturnType<typeof this.findUserProfileByUserId>>;
    teacher: Awaited<ReturnType<typeof this.findTeacherByUserId>> | null;
    student: Awaited<ReturnType<typeof this.findStudentByUserProfileId>> | null;
  }> {
    const profile = await this.findUserProfileByUserId(userId);

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
      userRole === 'instructor' ? await this.findTeacherByUserId(userId) : null;

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
}
