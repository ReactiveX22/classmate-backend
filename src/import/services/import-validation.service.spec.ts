import { ImportValidationService } from './import-validation.service';

describe('ImportValidationService', () => {
  let service: ImportValidationService;

  beforeEach(() => {
    service = new ImportValidationService();
  });

  describe('student import', () => {
    it('accepts a valid row', () => {
      const result = service.validate(
        [
          {
            name: 'Alice Smith',
            email: 'alice@example.com',
            studentId: 'STU-001',
            phone: '+1 555 123 4567',
          },
        ],
        'student',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(1);
      expect(result.validRows[0]).toEqual({
        rowNumber: 2,
        name: 'Alice Smith',
        email: 'alice@example.com',
        studentId: 'STU-001',
        phone: '+1 555 123 4567',
      });
      expect(result.failedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });

    it('fails a row with a too-short name', () => {
      const result = service.validate(
        [{ name: 'A', email: 'alice@example.com' }],
        'student',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(0);
      expect(result.failedCount).toBe(1);
      expect(result.issues[0].kind).toBe('failed');
      expect(result.issues[0].message).toContain('Name is required');
    });

    it('fails a row with an invalid email', () => {
      const result = service.validate(
        [{ name: 'Alice', email: 'not-an-email' }],
        'student',
        new Set(),
        new Set(),
      );

      expect(result.failedCount).toBe(1);
      expect(result.issues[0].field).toBe('email');
    });

    it('skips a duplicate email within the file', () => {
      const result = service.validate(
        [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Alicia', email: 'alice@example.com' },
        ],
        'student',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(1);
      expect(result.skippedCount).toBe(1);
      expect(result.issues[0].kind).toBe('skipped');
      expect(result.issues[0].message).toContain('Duplicate email');
    });

    it('skips a row whose email already exists', () => {
      const result = service.validate(
        [{ name: 'Alice', email: 'alice@example.com' }],
        'student',
        new Set(['alice@example.com']),
        new Set(),
      );

      expect(result.validRows).toHaveLength(0);
      expect(result.skippedCount).toBe(1);
      expect(result.issues[0].message).toContain('already exists');
    });

    it('skips a duplicate student id within the file', () => {
      const result = service.validate(
        [
          { name: 'Alice', email: 'alice@example.com', studentId: 'STU-1' },
          { name: 'Bob', email: 'bob@example.com', studentId: 'STU-1' },
        ],
        'student',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(1);
      expect(result.skippedCount).toBe(1);
      expect(result.issues[0].field).toBe('studentId');
    });

    it('skips a row whose student id already exists', () => {
      const result = service.validate(
        [{ name: 'Alice', email: 'alice@example.com', studentId: 'STU-1' }],
        'student',
        new Set(),
        new Set(['STU-1']),
      );

      expect(result.validRows).toHaveLength(0);
      expect(result.skippedCount).toBe(1);
    });
  });

  describe('teacher import', () => {
    it('validates optional title and join date', () => {
      const result = service.validate(
        [
          {
            name: 'Jane Doe',
            email: 'jane@example.com',
            title: 'Dr.',
            joinDate: '2024-01-15',
          },
        ],
        'teacher',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(1);
      expect(result.validRows[0].title).toBe('Dr.');
      expect(result.validRows[0].joinDate).toBe('2024-01-15');
    });

    it('flags an invalid join date as a warning and drops it', () => {
      const result = service.validate(
        [{ name: 'Jane', email: 'jane@example.com', joinDate: '15/01/2024' }],
        'teacher',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(1);
      expect(result.validRows[0].joinDate).toBeUndefined();
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('warning');
    });

    it('ignores student-only fields for teachers', () => {
      const result = service.validate(
        [{ name: 'Jane', email: 'jane@example.com', studentId: 'STU-9' }],
        'teacher',
        new Set(),
        new Set(),
      );

      expect(result.validRows).toHaveLength(1);
      expect(result.validRows[0].studentId).toBeUndefined();
    });
  });

  describe('file-level checks', () => {
    it('throws when required columns are missing entirely', () => {
      expect(() =>
        service.validate(
          [{ wrongColumn: 'x' }],
          'student',
          new Set(),
          new Set(),
        ),
      ).toThrow('Required column(s) missing');
    });

    it('tolerates an empty file without throwing', () => {
      const result = service.validate([], 'student', new Set(), new Set());

      expect(result.validRows).toHaveLength(0);
      expect(result.failedCount).toBe(0);
    });
  });
});
