import { ExecutionContext } from '@nestjs/common';
import { ClassroomMemberGuard } from '../classroom-member.guard';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';

describe('ClassroomMemberGuard', () => {
  let guard: ClassroomMemberGuard;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: {
        classroomMembers: { findFirst: vi.fn() },
        classroom: { findFirst: vi.fn() },
      },
    };
    guard = new ClassroomMemberGuard(mockDb);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  function mockExecutionContext(
    session: any,
    params: any = {},
  ): ExecutionContext {
    const request = { session, params } as any;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when user is a student member', async () => {
    mockDb.query.classroomMembers.findFirst.mockResolvedValue({
      classroomId: 'class-1',
      studentId: 'student-1',
    });
    mockDb.query.classroom.findFirst.mockResolvedValue(null);

    const ctx = mockExecutionContext(
      { user: { id: 'student-1' } },
      { classroomId: 'class-1' },
    );

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('allows access when user is the classroom teacher', async () => {
    mockDb.query.classroomMembers.findFirst.mockResolvedValue(null);
    mockDb.query.classroom.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'teacher-1',
    });

    const ctx = mockExecutionContext(
      { user: { id: 'teacher-1' } },
      { classroomId: 'class-1' },
    );

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('allows access when user is both student and teacher', async () => {
    mockDb.query.classroomMembers.findFirst.mockResolvedValue({
      classroomId: 'class-1',
      studentId: 'user-1',
    });
    mockDb.query.classroom.findFirst.mockResolvedValue({
      id: 'class-1',
      teacherId: 'user-1',
    });

    const ctx = mockExecutionContext(
      { user: { id: 'user-1' } },
      { classroomId: 'class-1' },
    );

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockDb.query.classroomMembers.findFirst).toHaveBeenCalled();
    expect(mockDb.query.classroom.findFirst).toHaveBeenCalled();
  });

  it('throws when user is not a member and not the teacher', async () => {
    mockDb.query.classroomMembers.findFirst.mockResolvedValue(null);
    mockDb.query.classroom.findFirst.mockResolvedValue(null);

    const ctx = mockExecutionContext(
      { user: { id: 'outsider-1' } },
      { classroomId: 'class-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      ApplicationForbiddenException,
    );
  });

  it('queries with correct classroomId and studentId', async () => {
    mockDb.query.classroomMembers.findFirst.mockResolvedValue(null);
    mockDb.query.classroom.findFirst.mockResolvedValue(null);

    const ctx = mockExecutionContext(
      { user: { id: 'student-42' } },
      { classroomId: 'class-99' },
    );

    try {
      await guard.canActivate(ctx);
    } catch (error) {
      expect(error).toBeDefined();
    }

    expect(mockDb.query.classroomMembers.findFirst).toHaveBeenCalledWith({
      where: expect.anything(),
    });
    expect(mockDb.query.classroom.findFirst).toHaveBeenCalledWith({
      where: expect.anything(),
    });
  });
});
