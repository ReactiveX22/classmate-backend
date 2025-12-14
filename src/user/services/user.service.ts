import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';
import { userProfile } from 'src/database/schema';
import { TeacherRepository } from '../repositories/teacher.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userProfileRepository: UserProfileRepository,
    private readonly teacherRepository: TeacherRepository,
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
      const profile = await tx
        .insert(userProfile)
        .values({
          userId: data.userId,
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
          displayName: data.profile.displayName,
          phone: data.profile.phone,
          bio: data.profile.bio,
        })
        .returning();

      return profile[0];
    });
  }

  async createTeacher(data: {
    userProfileId: string;
    title:
      | 'Professor'
      | 'Associate Professor'
      | 'Assistant Professor'
      | 'Lecturer'
      | 'Instructor';
    joinDate: string;
  }) {
    return this.teacherRepository.create(data);
  }

  async findUserProfileByUserId(userId: string) {
    return this.userProfileRepository.findByUserId(userId);
  }

  async findTeacherByUserProfileId(userProfileId: string) {
    return this.teacherRepository.findByUserProfileId(userProfileId);
  }
}
