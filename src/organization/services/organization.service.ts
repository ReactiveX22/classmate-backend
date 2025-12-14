import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { organization } from 'src/database/schema';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async createOrganization(data: typeof organization.$inferInsert) {
    // Check if organization with same slug already exists
    const existing = await this.organizationRepository.findBySlug(data.slug);
    if (existing) {
      throw new Error(`Organization with slug ${data.slug} already exists`);
    }

    return this.organizationRepository.create(data);
  }

  async findOrganizationById(id: string) {
    return this.organizationRepository.findById(id);
  }

  async findOrganizationBySlug(slug: string) {
    return this.organizationRepository.findBySlug(slug);
  }

  async findAllOrganizations() {
    return this.organizationRepository.findAll();
  }

  async updateOrganization(
    id: string,
    data: Partial<typeof organization.$inferInsert>,
  ) {
    const existing = await this.organizationRepository.findById(id);
    if (!existing) {
      throw new Error(`Organization with id ${id} not found`);
    }

    return this.organizationRepository.update(id, data);
  }
}
