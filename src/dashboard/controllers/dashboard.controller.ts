import { Controller, Get } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { DashboardService } from '../services/dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles([AppRole.Admin, AppRole.SuperAdmin])
  @Get('admin/stats')
  async getAdminStats(@OrganizationId() orgId: string) {
    return this.dashboardService.getAdminStats(orgId);
  }
}
