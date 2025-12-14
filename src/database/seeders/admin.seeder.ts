import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { UserService } from 'src/user/services/user.service';
import { BaseSeeder } from './base.seeder';
import adminData from './data/admin.json';
import { OrganizationService } from 'src/organization/services/organization.service';

@Injectable()
export class AdminSeeder extends BaseSeeder {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService<any>,
    private readonly organizationService: OrganizationService,
  ) {
    super('Admin');
  }

  async seed(): Promise<void> {
    this.log('Starting admin seeder...');

    const existingUser = await this.userService.findUserByEmail(
      adminData.email,
    );

    if (existingUser) {
      this.warn(
        `Admin user with email ${adminData.email} already exists. Skipping.`,
      );
      return;
    }

    try {
      // Create user via better-auth API
      const signupResult = await this.authService.api.signUpEmail({
        body: {
          email: adminData.email,
          password: adminData.password,
          name: adminData.name,
        },
      });

      if (!signupResult?.user?.id) {
        throw new Error('Failed to create admin user via better-auth');
      }

      const userId = signupResult.user.id;

      // Update user role to admin
      await this.userService.updateUserRole(userId, AppRole.Admin);

      // Get organization
      const organizations =
        await this.organizationService.findAllOrganizations();
      const organizationId = organizations[0]?.id;

      if (!organizationId) {
        this.warn(
          'No organization found. Admin user will not be linked to any organization.',
        );
      }

      // Create user profile
      const profile = await this.userService.createUserWithProfile({
        userId,
        name: adminData.name,
        email: adminData.email,
        role: AppRole.Admin,
        organizationId,
        status: 'active',
        profile: {
          firstName: adminData.profile.firstName,
          lastName: adminData.profile.lastName,
          displayName: adminData.profile.displayName,
        },
      });

      this.log(
        `✓ Admin user created successfully: ${adminData.email} (ID: ${userId})`,
      );
      this.warn(
        `⚠ WARNING: Default admin password is '${adminData.password}'. Change it in production!`,
      );
    } catch (error: any) {
      this.error(`Failed to create admin user: ${error.message}`, error);
      throw error;
    }
  }
}
