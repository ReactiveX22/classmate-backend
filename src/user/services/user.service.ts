import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from 'src/common/dto/pagination.dto';
import { user } from 'src/database/schema';
import { StorageService } from 'src/storage/storage.service';
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
    this.userRepository.update(userId, {
      organizationId: orgId,
    });
  }

  async remove(userId: string) {
    await this.userRepository.delete(userId);
  }

  async findUserWithRelationships(userId: string) {
    return this.userRepository.findUserWithRelationships(userId);
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
    let { skills, achievements, phone, bio } = data;

    if (typeof (skills as any) === 'string') {
      try {
        skills = JSON.parse(skills as any);
      } catch {
        skills = (skills as any).split(',').map((s: string) => s.trim());
      }
    }
    if (typeof (achievements as any) === 'string') {
      try {
        achievements = JSON.parse(achievements as any);
      } catch {
        achievements = [];
      }
    }

    const processedAchievements = achievements?.map((achievement) => ({
      ...achievement,
      id: achievement.id || nanoid(),
    }));

    // Collect profile data to update
    const profileUpdateData: any = {};
    if (phone !== undefined) profileUpdateData.phone = phone;
    if (bio !== undefined) profileUpdateData.bio = bio;
    if (skills !== undefined) profileUpdateData.skills = skills;
    if (processedAchievements !== undefined) {
      profileUpdateData.achievements = processedAchievements;
    }

    // Only call repository if there's data to save
    if (Object.keys(profileUpdateData).length > 0) {
      await this.userProfileRepository.save({
        userId,
        ...profileUpdateData,
      });
    }

    return this.getUserWithProfile(userId);
  }
}
