vi.mock('better-auth/api', () => ({
  createAuthMiddleware: (fn: any) => fn,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthResponseHook } from '../hooks/auth-response.hook';
import { UserService } from 'src/user/services/user.service';
import { UserStatus } from 'src/common/enums/user-status.enum';

describe('AuthResponseHook', () => {
  let hook: AuthResponseHook;
  let userService: { findUserWithRelationships: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userService = { findUserWithRelationships: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResponseHook,
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    hook = module.get(AuthResponseHook);
  });

  it('should be defined', () => {
    expect(hook).toBeDefined();
  });

  describe('createHook', () => {
    it('returns undefined for non sign-in/sign-up paths', async () => {
      const middleware = hook.createHook();
      const ctx = {
        path: '/some-other-path',
        context: { returned: { user: { id: '1' } } },
      };

      const result = await (middleware as any)(ctx);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no user in response', async () => {
      const middleware = hook.createHook();
      const ctx = {
        path: '/sign-in/email',
        context: { returned: {} },
      };

      const result = await (middleware as any)(ctx);
      expect(result).toBeUndefined();
    });

    it('blocks pending users with 403', async () => {
      const middleware = hook.createHook();
      const ctx = {
        path: '/sign-in/email',
        context: {
          returned: {
            user: { id: '1', status: UserStatus.Pending },
          },
        },
      };

      const result = await (middleware as any)(ctx);
      expect(result).toBeInstanceOf(Response);

      const body = await result.json();
      expect(body.message).toBe('Role pending approval');
      expect(result.status).toBe(403);
    });

    it('enriches response with profile data for active user', async () => {
      const mockUserWithRelations = {
        id: '1',
        name: 'Test User',
        profile: { firstName: 'Test', lastName: 'User' },
        teacher: { title: 'Prof.' },
        student: null,
      };
      userService.findUserWithRelationships.mockResolvedValue(
        mockUserWithRelations,
      );

      const jsonFn = vi.fn().mockReturnValue({ enriched: true });
      const middleware = hook.createHook();
      const ctx = {
        path: '/sign-in/email',
        context: {
          returned: {
            user: { id: '1', status: UserStatus.Active },
          },
        },
        json: jsonFn,
      };

      await (middleware as any)(ctx);

      expect(userService.findUserWithRelationships).toHaveBeenCalledWith('1');
      expect(jsonFn).toHaveBeenCalled();
      const callArg = jsonFn.mock.calls[0][0];
      expect(callArg.user.profile).toBeDefined();
    });

    it('falls back to original response when user relationships not found', async () => {
      userService.findUserWithRelationships.mockResolvedValue(null);

      const jsonFn = vi.fn();
      const middleware = hook.createHook();
      const originalResponse = {
        user: { id: '1', status: UserStatus.Active, name: 'Test' },
      };
      const ctx = {
        path: '/sign-up/email',
        context: { returned: originalResponse },
        json: jsonFn,
      };

      await (middleware as any)(ctx);

      expect(jsonFn).toHaveBeenCalledWith(originalResponse);
    });

    it('merges teacher and student profiles', async () => {
      const mockUser = {
        id: '1',
        profile: { firstName: 'Jane' },
        teacher: { title: 'Dr.' },
        student: { studentId: 'STU001' },
      };
      userService.findUserWithRelationships.mockResolvedValue(mockUser);

      const jsonFn = vi.fn();
      const middleware = hook.createHook();
      const ctx = {
        path: '/sign-in/email',
        context: {
          returned: {
            user: { id: '1', status: UserStatus.Active },
          },
        },
        json: jsonFn,
      };

      await (middleware as any)(ctx);

      const callArg = jsonFn.mock.calls[0][0];
      expect(callArg.user.profile.firstName).toBe('Jane');
      expect(callArg.user.profile.title).toBe('Dr.');
      expect(callArg.user.profile.studentId).toBe('STU001');
    });
  });
});
