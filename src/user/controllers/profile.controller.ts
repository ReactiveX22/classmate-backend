import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { ApplicationBadRequestException } from 'src/common/exceptions/application.exception';
import { type AppUserSession } from 'src/common/types/session.types';
import { SaveProfileDto } from '../dto/save-profile.dto';
import { UserService } from '../services/user.service';

@Controller('users/me')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getProfile(@Session() session: AppUserSession) {
    const user = await this.userService.getUserWithProfile(
      session.user.id,
      session.user.role ?? undefined,
    );
    return user;
  }

  @Patch()
  async updateProfile(
    @Session() session: AppUserSession,
    @Body() data: SaveProfileDto,
  ) {
    if (!data || Object.keys(data).length === 0) {
      throw new ApplicationBadRequestException(
        'At least one field must be provided',
      );
    }
    const user = await this.userService.updateProfile(session.user.id, data);
    return user;
  }
}
