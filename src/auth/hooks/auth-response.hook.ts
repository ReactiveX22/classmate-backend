import { Injectable } from '@nestjs/common';
import { createAuthMiddleware } from 'better-auth/api';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UserService } from 'src/user/services/user.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { AppRole } from 'src/common/enums/role.enum';

@Injectable()
export class AuthResponseHook {
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a Better Auth middleware to enrich login/signup responses
   */
  createHook() {
    return createAuthMiddleware(async (ctx) => {
      if (
        ['/sign-in/email', '/sign-up/email', '/get-session'].includes(ctx.path)
      ) {
        const originalResponse = ctx.context.returned as any;
        if (!originalResponse || !originalResponse.user) {
          return;
        }

        const userId = originalResponse.user.id;
        const userRole = originalResponse.user.role;

        if (!userRole) {
          return new Response(
            JSON.stringify({
              message: 'Role not assigned',
              errorCode: ERROR_CODES.AUTH.ROLE_NOT_ASSIGNED,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        if (userRole === AppRole.Pending) {
          return new Response(
            JSON.stringify({
              message: 'Role pending approval',
              errorCode: ERROR_CODES.AUTH.ROLE_PENDING,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

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
