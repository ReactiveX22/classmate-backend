import { Injectable } from '@nestjs/common';
import {
  AfterHook,
  BeforeHook,
  Hook,
  type AuthHookContext,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { OrganizationService } from 'src/organization/services/organization.service';
import { UserService } from 'src/user/services/user.service';
import { SignupDto } from '../dto/signup.dto';

@Hook()
@Injectable()
export class SignUpHook {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
  ) {}

  @BeforeHook('/sign-up/email')
  async signupUser(ctx: AuthHookContext) {
    const signupDto = await this.validateSignUpDto(ctx);
  }

  @AfterHook('/sign-up/email')
  async createOrgAfterSignUp(ctx: AuthHookContext) {
    const signupDto = await this.validateSignUpDto(ctx);

    const userId = ctx.context.newSession?.session.userId;
    if (!userId) {
      return; // create org later
    }

    // create organization
    const newOrg = await this.organizationService.createOrganization({
      name: signupDto.organizationName,
    });
    if (!newOrg)
      throw new APIError('INTERNAL_SERVER_ERROR', {
        message: 'Could not create organization',
      });

    // add organizationId
    this.userService.updateUserOrg(userId, newOrg.id);
  }

  private async validateSignUpDto(ctx: AuthHookContext) {
    const signupDto = plainToClass(SignupDto, ctx.body);
    const errors = await validate(signupDto, {
      skipMissingProperties: true,
    });
    if (errors.length > 0) {
      const validationErrors = errors.flatMap((error) => {
        if (error.constraints) {
          return Object.entries(error.constraints).map(([key, issue]) => ({
            field: error.property,
            issue: issue,
          }));
        }
        return [
          {
            field: error.property,
            issue: `Validation failed for property: ${error.property}`,
          },
        ];
      });

      throw new APIError('BAD_REQUEST', {
        message: 'Validation failed',
        errors: validationErrors,
      });
    }
    return signupDto;
  }
}
