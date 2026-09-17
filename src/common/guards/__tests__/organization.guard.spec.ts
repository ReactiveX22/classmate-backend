import { ExecutionContext } from '@nestjs/common';
import { OrganizationGuard } from '../organization.guard';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';

describe('OrganizationGuard', () => {
  let guard: OrganizationGuard;

  beforeEach(() => {
    guard = new OrganizationGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  function mockExecutionContext(session: any): ExecutionContext {
    const request = { session } as any;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when user has organizationId', () => {
    const ctx = mockExecutionContext({
      user: { organizationId: 'org-123' },
    });

    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('sets organizationId on request', () => {
    const request = { session: { user: { organizationId: 'org-123' } } } as any;
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    guard.canActivate(ctx);
    expect(request.organizationId).toBe('org-123');
  });

  it('throws when user has no organizationId', () => {
    const ctx = mockExecutionContext({
      user: { id: '1' },
    });

    expect(() => guard.canActivate(ctx)).toThrow(ApplicationForbiddenException);
  });

  it('throws when user is null', () => {
    const ctx = mockExecutionContext({
      user: null,
    });

    expect(() => guard.canActivate(ctx)).toThrow(ApplicationForbiddenException);
  });

  it('throws when session has no user', () => {
    const ctx = mockExecutionContext({});

    expect(() => guard.canActivate(ctx)).toThrow(ApplicationForbiddenException);
  });

  it('throws when session is undefined', () => {
    const ctx = mockExecutionContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ApplicationForbiddenException);
  });
});
