import { Injectable } from '@nestjs/common';
import { createAuthMiddleware } from 'better-auth/api';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { UserStatus } from 'src/common/enums/user-status.enum';
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
      if (!['/sign-in/email', '/sign-up/email'].includes(ctx.path)) {
        return;
      }

      const originalResponse = ctx.context.returned as any;
      if (!originalResponse?.user) return;

      const userId = originalResponse.user.id;
      const userStatus = originalResponse.user.status;

      if (userStatus === UserStatus.Pending) {
        return new Response(
          JSON.stringify({
            message: 'Role pending approval',
            errorCode: ERROR_CODES.AUTH.ROLE_PENDING,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const userWithRelationships =
        await this.userService.findUserWithRelationships(userId);

      if (!userWithRelationships) {
        return ctx.json(originalResponse);
      }

      let mergedProfile = {};

      if (userWithRelationships.profile) {
        mergedProfile = { ...userWithRelationships.profile };
      }

      if (userWithRelationships.teacher) {
        mergedProfile = { ...mergedProfile, ...userWithRelationships.teacher };
      }

      if (userWithRelationships.student) {
        mergedProfile = { ...mergedProfile, ...userWithRelationships.student };
      }

      const enrichedResponse = plainToInstance(
        AuthResponseDto,
        {
          ...originalResponse,
          user: {
            ...originalResponse.user,
            profile: mergedProfile,
          },
        },
        { excludeExtraneousValues: true },
      );

      return ctx.json(instanceToPlain(enrichedResponse));
    });
  }
}
