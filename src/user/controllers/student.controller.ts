import { Controller, Get, Query } from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import type { AppUserSession } from 'src/common/types/session.types';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { UserService } from '../services/user.service';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { AppRole } from 'src/common/enums/role.enum';

@Controller('students')
export class StudentController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get all students in the admin's organization with pagination.
   * Only accessible by organization admins.
   */
  @Get()
  @Roles([AppRole.Admin])
  async getStudents(
    @Query() query: PaginationQueryDto,
    @Session() session: AppUserSession,
  ) {
    // Verify user belongs to an organization
    const organizationId = session.user.organizationId;
    if (!organizationId) {
      throw new ApplicationForbiddenException(
        'User does not belong to any organization',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    return this.userService.getStudentsByOrganization(organizationId, query);
  }
}
