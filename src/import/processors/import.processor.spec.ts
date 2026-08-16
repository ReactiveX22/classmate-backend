import { Job } from 'bullmq';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NotificationType } from 'src/notification/notification.constants';
import type {
  ImportJobPayload,
  NormalizedRow,
} from '../interfaces/import-job.interface';
import { ImportProcessor } from './import.processor';

const JOB = {
  id: 'job_1',
  data: {
    jobId: 'job_1',
    organizationId: 'org_1',
    type: 'student' as const,
    fileKey: 'imports/previews/students.csv',
    createdById: 'user_1',
  },
};

function buildImportJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job_1',
    organizationId: 'org_1',
    type: 'student',
    fileName: 'students.csv',
    fileKey: 'imports/previews/students.csv',
    createdById: 'user_1',
    status: 'draft',
    ...overrides,
  };
}

function buildOutcome(
  rows: NormalizedRow[] = [],
  issues: unknown[] = [],
  failedCount = 0,
  skippedCount = 0,
) {
  return { validRows: rows, issues, failedCount, skippedCount };
}

function buildValidRow(email = 'alice@example.com'): NormalizedRow {
  return { rowNumber: 2, name: 'Alice Smith', email, phone: '+1 555 123 4567' };
}

interface MockChain {
  values: ReturnType<typeof vi.fn>;
  onConflictDoNothing: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
}

function buildProcessor({
  dbReturning = [{ id: 'user_1', email: 'alice@example.com' }],
  outcome = buildOutcome([buildValidRow()]),
  importJob = buildImportJob(),
  parserRows = [
    {
      name: 'Alice Smith',
      email: 'alice@example.com',
      phone: '+1 555 123 4567',
    },
  ],
}: {
  dbReturning?: unknown[];
  outcome?: ReturnType<typeof buildOutcome>;
  importJob?: ReturnType<typeof buildImportJob>;
  parserRows?: Record<string, string>[];
} = {}) {
  const chain: MockChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(dbReturning),
  };
  const db = { insert: vi.fn(() => chain) };

  const storage = {
    getFileBuffer: vi.fn().mockResolvedValue(Buffer.from('')),
    uploadFile: vi
      .fn()
      .mockResolvedValue({ url: '/api/v1/uploads/imports/errors/errors.csv' }),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };

  const repo = {
    findById: vi.fn().mockResolvedValue(importJob),
    patch: vi.fn().mockResolvedValue(importJob),
    findExistingEmails: vi.fn().mockResolvedValue(new Set<string>()),
    findExistingStudentIds: vi.fn().mockResolvedValue(new Set<string>()),
  };

  const parser = { parse: vi.fn().mockResolvedValue({ rows: parserRows }) };
  const validation = { validate: vi.fn().mockReturnValue(outcome) };
  const emitter = { emit: vi.fn() };

  const processor = new ImportProcessor(
    db as never,
    storage as never,
    parser as never,
    validation as never,
    repo as never,
    emitter as never,
  );

  return {
    processor,
    db,
    chain,
    storage,
    repo,
    parser,
    validation,
    emitter,
  };
}

function lastEvent(emitter: {
  emit: ReturnType<typeof vi.fn>;
}): NotificationCreatedEvent {
  const calls = emitter.emit.mock.calls as unknown[];
  const call = calls[calls.length - 1] as unknown[];
  return call[1] as NotificationCreatedEvent;
}

function lastPatch(repo: {
  patch: ReturnType<typeof vi.fn>;
}): Record<string, unknown> {
  const calls = repo.patch.mock.calls as unknown[];
  const call = calls[calls.length - 1] as unknown[];
  return call[1] as Record<string, unknown>;
}

describe('ImportProcessor', () => {
  it('imports valid rows and marks the job completed', async () => {
    const { processor, emitter, repo } = buildProcessor();

    const result = await processor.process({
      ...JOB,
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<ImportJobPayload>);

    expect(result).toEqual({ status: 'completed', imported: 1 });
    expect(lastPatch(repo)).toMatchObject({
      status: 'completed',
      imported: 1,
      errorFileKey: null,
      error: null,
    });
    expect(lastPatch(repo).processedAt).toBeInstanceOf(Date);
    expect(lastEvent(emitter).payload).toMatchObject({
      type: NotificationType.IMPORT.COMPLETED,
      recipientId: 'user_1',
      entityId: 'job_1',
    });
  });

  it('marks the job partial and uploads an error csv when rows are skipped', async () => {
    const skipped = buildOutcome(
      [buildValidRow()],
      [
        {
          row: 3,
          field: 'email',
          message: 'Email already exists',
          severity: 'error',
          kind: 'skipped',
        },
      ],
      0,
      1,
    );
    const { processor, emitter, storage } = buildProcessor({
      outcome: skipped,
    });

    const result = await processor.process({
      ...JOB,
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<ImportJobPayload>);

    expect(result).toEqual({ status: 'partial', imported: 1 });
    expect(storage.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'import-errors-job_1.csv' }),
      'imports/errors',
    );
    expect(lastEvent(emitter).payload).toMatchObject({
      type: NotificationType.IMPORT.FINISHED_WITH_ERRORS,
    });
  });

  it('deletes the source file when the job finishes', async () => {
    const { processor, storage } = buildProcessor();

    await processor.process({
      ...JOB,
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<ImportJobPayload>);

    expect(storage.deleteFile).toHaveBeenCalledWith(
      'imports/previews/students.csv',
    );
  });

  it('marks the job failed and emits a failure notification on a final attempt', async () => {
    const { processor, repo, parser, emitter } = buildProcessor();
    parser.parse.mockRejectedValue(new Error('boom'));

    await expect(
      processor.process({
        ...JOB,
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as Job<ImportJobPayload>),
    ).rejects.toThrow('boom');

    expect(lastPatch(repo)).toEqual({
      status: 'failed',
      error: 'boom',
    });
    expect(lastEvent(emitter).payload).toMatchObject({
      type: NotificationType.IMPORT.FAILED,
      content: 'boom',
    });
  });

  it('does not mark a job failed on a retryable attempt', async () => {
    const { processor, repo, parser, emitter } = buildProcessor();
    parser.parse.mockRejectedValue(new Error('boom'));

    await expect(
      processor.process({
        ...JOB,
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Job<ImportJobPayload>),
    ).rejects.toThrow('boom');

    expect(lastPatch(repo)).not.toEqual({
      status: 'failed',
      error: 'boom',
    });
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
