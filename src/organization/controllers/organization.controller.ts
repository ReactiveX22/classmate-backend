import { Controller, Get, Param } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { AppUserSession } from 'src/common/types/session.types';
import { OrganizationService } from '../services/organization.service';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';
import { ERROR_CODES } from 'src/common/constants/error.codes';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get(':id')
  async getOrganizationById(
    @Param('id') id: string,
    @Session() session: AppUserSession,
  ) {
    if (session.user.organizationId !== id) {
      throw new ApplicationForbiddenException(
        'You do not have access to this organization',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    return this.organizationService.findOrganizationById(id);
  }
}
