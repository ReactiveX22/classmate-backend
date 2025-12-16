import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { UserService } from 'src/user/services/user.service';
import { BaseSeeder } from './base.seeder';
import teachersData from './data/teachers.json';
import { OrganizationService } from 'src/organization/services/organization.service';

@Injectable()
export class TeacherSeeder extends BaseSeeder {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService<any>,
    private readonly organizationService: OrganizationService,
  ) {
    super('Teacher');
  }

  async seed(): Promise<void> {
    this.log(`Starting teacher seeder for ${teachersData.length} teachers...`);

    let created = 0;
    let skipped = 0;

    for (const teacherData of teachersData) {
      try {
        const existingUser = await this.userService.findUserByEmail(
          teacherData.email,
        );

        if (existingUser) {
          this.warn(
            `Teacher with email ${teacherData.email} already exists. Skipping.`,
          );
          skipped++;
          continue;
        }

        // Create user via better-auth API
        const signupResult = await this.authService.api.signUpEmail({
          body: {
            email: teacherData.email,
            password: teacherData.password,
            name: teacherData.name,
          },
        });

        if (!signupResult?.user?.id) {
          throw new Error('Failed to create teacher user via better-auth');
        }

        const userId = signupResult.user.id;

        // Update user role
        await this.userService.updateUserRole(userId, AppRole.Instructor);

        // Get organization
        const organizations =
          await this.organizationService.findAllOrganizations();
        const organizationId = organizations[0]?.id;

        // Create user profile
        const profile = await this.userService.createUserWithProfile({
          userId,
          name: teacherData.name,
          email: teacherData.email,
          role: AppRole.Instructor,
          organizationId,
          status: 'active',
          profile: {
            firstName: teacherData.profile.firstName,
            lastName: teacherData.profile.lastName,
            displayName: teacherData.profile.displayName,
            phone: teacherData.profile.phone,
            bio: teacherData.profile.bio,
          },
        });

        // Create teacher record
        await this.userService.createTeacher({
          userId,
          title: teacherData.teacher.title,
          joinDate: teacherData.teacher.joinDate,
        });

        created++;
        this.log(`✓ Created teacher: ${teacherData.email}`);
      } catch (error: any) {
        this.error(
          `Failed to create teacher ${teacherData.email}: ${error.message}`,
          error,
        );
      }
    }

    this.log(
      `Teacher seeder completed: ${created} created, ${skipped} skipped`,
    );
  }
}
