import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error.codes';
import { ApplicationForbiddenException } from '../exceptions/application.exception';

export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (request.organizationId) {
      return request.organizationId;
    }

    const organizationId = request.session?.user?.organizationId;

    if (!organizationId) {
      throw new ApplicationForbiddenException(
        'User does not belong to any organization',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    return organizationId;
  },
);
