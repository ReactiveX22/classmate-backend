import { Injectable } from '@nestjs/common';
import {
  CreateOrganizationInput,
  OrganizationRepository,
} from '../repositories/organization.repository';
import { organization } from 'src/database/schema';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { APIError } from 'better-auth';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async createOrganization(data: CreateOrganizationDto) {
    const slug = this.createSlugFromOrgName(data.name);

    const existing = await this.organizationRepository.findBySlug(slug);
    if (existing) {
      throw new APIError('BAD_REQUEST', {
        code: 'ORG_ALREADY_EXISTS',
        message: `Organization with slug ${slug} already exists`,
      });
    }

    const organizationData: CreateOrganizationInput = {
      ...data,
      slug,
    };

    return this.organizationRepository.create(organizationData);
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

  private createSlugFromOrgName(orgName: string): string {
    let newSlug = orgName.toLowerCase();

    newSlug = newSlug
      .replace(/\s+/g, '-') // Convert internal spaces to hyphens
      .replace(/[^\w-]/g, '') // Remove all non-word characters (except hyphens)
      .replaceAll('-', '-') // Keep hyphens
      .replace(/^-+|-+$/g, ''); // Trim

    return newSlug;
  }
}
