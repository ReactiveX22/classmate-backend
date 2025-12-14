import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { UserService } from 'src/user/services/user.service';
import { BaseSeeder } from './base.seeder';
import studentsData from './data/students.json';

@Injectable()
export class StudentSeeder extends BaseSeeder {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService<any>,
  ) {
    super('Student');
  }

  async seed(): Promise<void> {
    this.log(`Starting student seeder for ${studentsData.length} students...`);

    let created = 0;
    let skipped = 0;

    for (const studentData of studentsData) {
      try {
        const existingUser = await this.userService.findUserByEmail(
          studentData.email,
        );

        if (existingUser) {
          this.warn(
            `Student with email ${studentData.email} already exists. Skipping.`,
          );
          skipped++;
          continue;
        }

        // Create user via better-auth API
        const signupResult = await this.authService.api.signUpEmail({
          body: {
            email: studentData.email,
            password: studentData.password,
            name: studentData.name,
          },
        });

        if (!signupResult?.user?.id) {
          throw new Error('Failed to create student user via better-auth');
        }

        const userId = signupResult.user.id;

        // Update user role
        await this.userService.updateUserRole(userId, AppRole.Student);

        // Create user profile
        await this.userService.createUserWithProfile({
          userId,
          name: studentData.name,
          email: studentData.email,
          role: AppRole.Student,
          profile: {
            firstName: studentData.profile.firstName,
            lastName: studentData.profile.lastName,
            displayName: studentData.profile.displayName,
            phone: studentData.profile.phone,
          },
        });

        created++;
        this.log(`✓ Created student: ${studentData.email}`);
      } catch (error: any) {
        this.error(
          `Failed to create student ${studentData.email}: ${error.message}`,
          error,
        );
      }
    }

    this.log(
      `Student seeder completed: ${created} created, ${skipped} skipped`,
    );
  }
}
