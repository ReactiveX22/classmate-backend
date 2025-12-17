import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from 'src/auth/auth.factory';
import { ERROR_CODES } from '../constants/error.codes';
import { ApplicationForbiddenException } from '../exceptions/application.exception';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.session?.user as User;

    if (!user?.organizationId) {
      throw new ApplicationForbiddenException(
        'User does not belong to any organization',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    request.organizationId = user.organizationId;

    return true;
  }
}
