import { Injectable } from '@nestjs/common';
import { createAuthMiddleware } from 'better-auth/api';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UserService } from 'src/user/services/user.service';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class AuthResponseHook {
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a Better Auth middleware to enrich login/signup responses
   */
  createHook() {
    return createAuthMiddleware(async (ctx) => {
      if (['/sign-in/email', '/sign-up/email'].includes(ctx.path)) {
        const originalResponse = ctx.context.returned as any;
        if (!originalResponse || !originalResponse.user) {
          return;
        }

        const userId = originalResponse.user.id;
        const userRole = originalResponse.user.role;

        const userWithProfile = await this.userService.getUserWithProfile(
          userId,
          userRole,
        );
        let mergedProfile = {};

        if (userWithProfile.profile) {
          mergedProfile = { ...userWithProfile.profile };

          if (userWithProfile.teacher) {
            mergedProfile = { ...mergedProfile, ...userWithProfile.teacher };
          }

          if (userWithProfile.student) {
            mergedProfile = { ...mergedProfile, ...userWithProfile.student };
          }
        }

        const rawEnrichedUser = {
          ...originalResponse.user,
          profile: mergedProfile,
        };

        const enrichedResponse = plainToInstance(
          AuthResponseDto,
          {
            ...originalResponse,
            user: rawEnrichedUser,
          },
          {
            excludeExtraneousValues: true,
          },
        );

        return ctx.json(instanceToPlain(enrichedResponse));
      }
    });
  }
}
