import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ERROR_CODES } from '../constants/error.codes';
import { ApplicationForbiddenException } from '../exceptions/application.exception';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.session?.user;

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
