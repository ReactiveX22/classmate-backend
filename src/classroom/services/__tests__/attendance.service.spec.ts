import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from '../attendance.service';
import { AttendanceRepository } from '../../repositories/attendance.repository';
import { ClassroomService } from '../../services/classroom.service';
import { AppRole } from 'src/common/enums/role.enum';
import {
  ApplicationForbiddenException,
  ApplicationBadRequestException,
} from 'src/common/exceptions/application.exception';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: any;
  let classroomService: any;

  const mockClassroom = {
    id: 'class-1',
    teacherId: 'teacher-1',
    classroomMembers: [{ studentId: 'student-1' }, { studentId: 'student-2' }],
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    attendanceRepository = {
      upsert: vi.fn(),
      upsertBulk: vi.fn(),
      getChecklist: vi.fn(),
      getStudentStats: vi.fn(),
    };

    classroomService = {
      findOne: vi.fn().mockResolvedValue(mockClassroom),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: attendanceRepository },
        { provide: ClassroomService, useValue: classroomService },
      ],
    }).compile();

    service = module.get(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates attendance for a valid student', async () => {
      attendanceRepository.upsert.mockResolvedValue({
        id: 'att-1',
        studentId: 'student-1',
        status: 'present',
      });

      const result = await service.create('class-1', 'teacher-1', 'org-1', {
        studentId: 'student-1',
        status: 'present',
        date: '2026-09-17',
      });

      expect(result).toBeDefined();
      expect(result.studentId).toBe('student-1');
      expect(attendanceRepository.upsert).toHaveBeenCalled();
    });

    it('throws when non-teacher tries to create attendance', async () => {
      await expect(
        service.create('class-1', 'student-1', 'org-1', {
          studentId: 'student-2',
          status: 'present',
        }),
      ).rejects.toThrow(ApplicationForbiddenException);
    });

    it('throws when student is not a classroom member', async () => {
      await expect(
        service.create('class-1', 'teacher-1', 'org-1', {
          studentId: 'outsider-1',
          status: 'present',
        }),
      ).rejects.toThrow(ApplicationBadRequestException);
    });

    it('throws when marking attendance for a future date', async () => {
      await expect(
        service.create('class-1', 'teacher-1', 'org-1', {
          studentId: 'student-1',
          status: 'present',
          date: '2099-01-01',
        }),
      ).rejects.toThrow(ApplicationBadRequestException);
    });
  });

  describe('getStats', () => {
    it('returns attendance stats for a student', async () => {
      attendanceRepository.getStudentStats.mockResolvedValue({
        total: 10,
        present: 8,
        late: 1,
        absent: 1,
      });

      const result = await service.getStats(
        {
          user: { id: 'student-1', role: AppRole.Student },
          session: {} as any,
        } as any,
        'class-1',
        'org-1',
        'student-1',
      );

      expect(result.total).toBe(10);
      expect(result.present).toBe(8);
      expect(result.attendanceRate).toBe(90);
    });

    it('allows instructor to view stats for their classroom', async () => {
      attendanceRepository.getStudentStats.mockResolvedValue({
        total: 5,
        present: 5,
        late: 0,
        absent: 0,
      });

      const result = await service.getStats(
        {
          user: { id: 'teacher-1', role: AppRole.Instructor },
          session: {} as any,
        } as any,
        'class-1',
        'org-1',
        'student-1',
      );

      expect(result).toBeDefined();
      expect(result.attendanceRate).toBe(100);
    });

    it('throws when instructor tries to view another classroom stats', async () => {
      await expect(
        service.getStats(
          {
            user: { id: 'teacher-other', role: AppRole.Instructor },
            session: {} as any,
          } as any,
          'class-1',
          'org-1',
          'student-1',
        ),
      ).rejects.toThrow(ApplicationForbiddenException);
    });

    it('throws when student tries to view another student stats', async () => {
      await expect(
        service.getStats(
          {
            user: { id: 'student-1', role: AppRole.Student },
            session: {} as any,
          } as any,
          'class-1',
          'org-1',
          'student-2',
        ),
      ).rejects.toThrow(ApplicationForbiddenException);
    });
  });
});
