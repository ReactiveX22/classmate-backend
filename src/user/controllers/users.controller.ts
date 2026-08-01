import { Controller, Get, Param } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { OrganizationId } from 'src/common/decorators';
import { OrganizationGuard } from 'src/common/guards';
import { UserService } from '../services/user.service';

@Controller('users')
@UseGuards(OrganizationGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get(':id/profile')
  async getProfile(@Param('id') id: string, @OrganizationId() orgId: string) {
    return this.userService.getPublicUserProfile(id, orgId);
  }
}
