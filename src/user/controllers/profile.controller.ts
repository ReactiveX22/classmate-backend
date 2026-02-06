import { Controller, Get } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { Session } from '@thallesp/nestjs-better-auth';
import { type AppUserSession } from 'src/common/types/session.types';

@Controller('users/me')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getProfile(@Session() session: AppUserSession) {
    const user = await this.userService.getUserWithProfile(session.user.id);
    return user;
  }
}
