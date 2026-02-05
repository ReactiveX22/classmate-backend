import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Roles([
    AppRole.Admin,
    AppRole.SuperAdmin,
    AppRole.Instructor,
    AppRole.Student,
  ])
  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.notificationService.findAll(query, session.user.id, orgId);
  }

  @Roles([
    AppRole.Admin,
    AppRole.SuperAdmin,
    AppRole.Instructor,
    AppRole.Student,
  ])
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Session() session: AppUserSession,
  ) {
    return this.notificationService.markAsRead(id, session.user.id);
  }

  @Roles([
    AppRole.Admin,
    AppRole.SuperAdmin,
    AppRole.Instructor,
    AppRole.Student,
  ])
  @Patch('read-all')
  async markAllAsRead(
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.notificationService.markAllAsRead(session.user.id, orgId);
  }
}
