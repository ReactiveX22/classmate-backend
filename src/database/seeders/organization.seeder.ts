import { Injectable } from '@nestjs/common';
import { BaseSeeder } from './base.seeder';
import { OrganizationService } from 'src/organization/services/organization.service';
import organizationsData from './data/organizations.json';

@Injectable()
export class OrganizationSeeder extends BaseSeeder {
  constructor(private readonly organizationService: OrganizationService) {
    super('Organization');
  }

  async seed(): Promise<void> {
    this.log(
      `Starting organization seeder for ${organizationsData.length} organizations...`,
    );
    try {
      for (const org of organizationsData) {
        const existing = await this.organizationService.findOrganizationBySlug(
          org.slug,
        );
        if (existing) {
          // Update existing organization
          await this.organizationService.updateOrganization(existing.id, org);
          this.log(`✓ Updated organization: ${org.name}`);
        } else {
          // Create new organization
          await this.organizationService.createOrganization(org);
          this.log(`✓ Created organization: ${org.name}`);
        }
      }

      this.log('Organizations seeded successfully.');
    } catch (error) {
      this.error('Failed to seed organizations', error);
      throw error;
    }
  }
}
