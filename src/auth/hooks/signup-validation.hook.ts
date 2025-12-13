import { Injectable } from '@nestjs/common';
import {
  BeforeHook,
  Hook,
  type AuthHookContext,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SignupDto } from '../dto/signup.dto';

@Hook()
@Injectable()
export class SignupValidationHook {
  @BeforeHook('/sign-up/email')
  async validateSignup(ctx: AuthHookContext) {
    const signupDto = plainToClass(SignupDto, ctx.body);

    const errors = await validate(signupDto);

    if (errors.length > 0) {
      // Create structured validation errors
      const validationErrors = errors.map((error) => ({
        field: error.property,
        issue: Object.values(error.constraints || {})[0] || 'Validation failed',
      }));

      throw new APIError('BAD_REQUEST', {
        message: 'Validation failed',
        errors: validationErrors,
      });
    }
  }
}
