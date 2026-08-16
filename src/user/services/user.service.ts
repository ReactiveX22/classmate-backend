import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { Achievement, user } from 'src/database/schema';
import { StorageService } from 'src/storage/storage.service';
import { ApplicationNotFoundException } from 'src/common/exceptions/application.exception';
import { SaveProfileDto } from '../dto/save-profile.dto';
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
    private readonly storageService: StorageService,
  ) {}

  async createTeacher(data: {
    userId: string;
    title?: string;
    joinDate?: string;
  }) {
    return this.teacherRepository.create(data);
  }

  async update(userId: string, data: Partial<typeof user.$inferInsert>) {
    return this.userRepository.update(userId, data);
  }

  async findTeacherByUserId(userId: string) {
    return this.teacherRepository.findByUserId(userId);
  }

  async findStudentByUserProfileId(userProfileId: string) {
    return this.studentRepository.findByUserProfileId(userProfileId);
  }

  async getStudentsByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<StudentWithProfile>> {
    return this.studentRepository.findByOrganization(organizationId, query);
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
    await this.userRepository.update(userId, {
      organizationId: orgId,
    });
  }

  async remove(userId: string) {
    await this.userRepository.delete(userId);
  }

  async findUserWithRelationships(userId: string) {
    return this.userRepository.findUserWithRelationships(userId);
  }

  async getPublicUserProfile(userId: string, orgId: string, callerRole?: string) {
    const user = await this.userRepository.findUserWithRelationships(userId);

    if (!user || user.organizationId !== orgId) {
      throw new ApplicationNotFoundException('User not found');
    }

    const isAdmin = callerRole === 'admin';

    const baseProfile = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        role: user.role ?? null,
        ...(isAdmin
          ? {
              status: user.status,
              banned: user.banned ?? false,
              banReason: user.banReason ?? null,
              createdAt: user.createdAt,
            }
          : {}),
      },
      profile: user.profile
        ? {
            bio: user.profile.bio,
            skills: user.profile.skills ?? [],
            achievements: user.profile.achievements ?? [],
          }
        : null,
      teacher: user.teacher
        ? {
            title: user.teacher.title,
            joinDate: user.teacher.joinDate,
          }
        : null,
      student: user.student
        ? {
            studentId: user.student.studentId,
          }
        : null,
    };

    if (!isAdmin) {
      return baseProfile;
    }

    let courses: Array<{
      id: string;
      code: string;
      title: string;
      status: string;
    }> = [];
    let classrooms: Array<{
      id: string;
      name: string;
      section: string | null;
      status: string;
      course: { id: string; code: string; title: string } | null;
    }> = [];

    if (user.role === 'student' && user.student) {
      const enrolled = await this.userRepository.findCoursesForStudent(
        user.student.id,
      );
      courses = enrolled.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        status: course.status,
      }));

      const joined = await this.userRepository.findClassroomsForStudent(
        user.id,
      );
      classrooms = joined.map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        section: classroom.section ?? null,
        status: classroom.status,
        course: classroom.course
          ? {
              id: classroom.course.id,
              code: classroom.course.code,
              title: classroom.course.title,
            }
          : null,
      }));
    } else if (user.role === 'instructor') {
      const assigned = await this.userRepository.findCoursesForTeacher(user.id);
      courses = assigned.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        status: course.status,
      }));

      const teaching = await this.userRepository.findClassroomsForTeacher(
        user.id,
      );
      classrooms = teaching.map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        section: classroom.section ?? null,
        status: classroom.status,
        course: classroom.course
          ? {
              id: classroom.course.id,
              code: classroom.course.code,
              title: classroom.course.title,
            }
          : null,
      }));
    }

    return {
      ...baseProfile,
      courses,
      classrooms,
    };
  }

  async updateProfile(
    userId: string,
    data: SaveProfileDto,
    image?: Express.Multer.File,
  ) {
    // Handle image upload if provided
    if (image) {
      const uploadResult = await this.storageService.uploadFile(
        image,
        'profiles',
      );

      await this.userRepository.update(userId, {
        image: uploadResult.url,
      });
    }

    // Parse skills and achievements if they are strings (sent via form-data)
    const {
      skills: rawSkills,
      achievements: rawAchievements,
      phone,
      bio,
    } = data;

    let skills: string[] | undefined = rawSkills;
    let achievements: Achievement[] | undefined = rawAchievements as
      | Achievement[]
      | undefined;

    if (typeof rawSkills === 'string') {
      try {
        skills = JSON.parse(rawSkills) as string[];
      } catch {
        const str = rawSkills as string;
        skills = str.split(',').map((s) => s.trim());
      }
    }
    if (typeof rawAchievements === 'string') {
      try {
        achievements = JSON.parse(rawAchievements) as Achievement[];
      } catch {
        achievements = [];
      }
    }

    const processedAchievements = achievements?.map((achievement) => ({
      ...achievement,
      id: achievement.id || nanoid(),
    }));

    const profileUpdateData: Partial<{
      phone: string | null;
      bio: string | null;
      skills: string[];
      achievements: Achievement[];
    }> = {};
    if (phone !== undefined) profileUpdateData.phone = phone;
    if (bio !== undefined) profileUpdateData.bio = bio;
    if (skills !== undefined) profileUpdateData.skills = skills;
    if (processedAchievements !== undefined) {
      profileUpdateData.achievements = processedAchievements;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await this.userProfileRepository.save({
        userId,
        ...profileUpdateData,
      });
    }

    return this.getUserWithProfile(userId);
  }
}
