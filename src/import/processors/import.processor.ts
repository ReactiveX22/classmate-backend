import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { nanoid } from 'nanoid';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { type DB, InjectDb } from 'src/database/db.provider';
import {
  account,
  student,
  teacher,
  user,
  userProfile,
} from 'src/database/schema';
import type { ImportRowError } from 'src/database/schema/import-job-schema';
import type { SelectImportJob } from 'src/database/schema';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NotificationType } from 'src/notification/notification.constants';
import { StorageService } from 'src/storage/storage.service';
import {
  IMPORT_DEFAULTS,
  IMPORT_QUEUE_NAME,
  type ImportType,
} from '../import.constants';
import {
  ImportJobPayload,
  NormalizedRow,
} from '../interfaces/import-job.interface';
import { ImportJobRepository } from '../repositories/import-job.repository';
import { capIssues, collectEmails, collectStudentIds } from '../utils/row.util';
import { ImportParserService } from '../services/import-parser.service';
import {
  ImportValidationService,
  ValidationOutcome,
} from '../services/import-validation.service';

const UPLOADS_PREFIX = '/api/v1/uploads/';

@Processor(IMPORT_QUEUE_NAME, {
  concurrency: IMPORT_DEFAULTS.queueConcurrency,
})
export class ImportProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ImportProcessor.name);

  onModuleInit() {
    this.logger.log(
      `Import Worker started (concurrency: ${IMPORT_DEFAULTS.queueConcurrency})`,
    );
  }

  constructor(
    @InjectDb() private readonly db: DB,
    private readonly storageService: StorageService,
    private readonly parserService: ImportParserService,
    private readonly validationService: ImportValidationService,
    private readonly jobRepository: ImportJobRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<ImportJobPayload>): Promise<unknown> {
    const { jobId, organizationId, type, fileKey } = job.data;

    try {
      const importJob = await this.jobRepository.findById(jobId);
      if (!importJob) {
        this.logger.warn(`Import job ${jobId} not found`);
        return { status: 'not-found' };
      }

      const outcome = await this.validate(
        jobId,
        type,
        fileKey,
        importJob.fileName ?? '',
      );

      await this.jobRepository.patch(jobId, {
        status: 'processing',
        total:
          outcome.validRows.length + outcome.failedCount + outcome.skippedCount,
        skipped: outcome.skippedCount,
        failed: outcome.failedCount,
        errorSummary: capIssues(outcome.issues),
        imported: 0,
      });

      let imported = 0;
      for (
        let offset = 0;
        offset < outcome.validRows.length;
        offset += IMPORT_DEFAULTS.batchSize
      ) {
        const batch = outcome.validRows.slice(
          offset,
          offset + IMPORT_DEFAULTS.batchSize,
        );
        imported += await this.writeBatch(batch, type, organizationId);
        await this.jobRepository.patch(jobId, { imported });
      }

      const status =
        outcome.failedCount > 0 || outcome.skippedCount > 0
          ? 'partial'
          : 'completed';

      await this.finish(jobId, status, outcome, imported);

      this.logger.log(
        `Import job ${jobId} finished: ${imported} imported, ${outcome.skippedCount} skipped, ${outcome.failedCount} failed`,
      );

      return { status, imported };
    } catch (error) {
      return this.handleProcessError(job, error);
    }
  }

  private async validate(
    jobId: string,
    type: ImportType,
    fileKey: string,
    fileName: string,
  ): Promise<ValidationOutcome> {
    await this.jobRepository.patch(jobId, { status: 'validating' });

    const buffer = await this.storageService.getFileBuffer(fileKey);
    const { rows } = await this.parserService.parse(buffer, fileName);

    const existingEmails = await this.jobRepository.findExistingEmails(
      collectEmails(rows),
    );
    const existingStudentIds =
      type === 'student'
        ? await this.jobRepository.findExistingStudentIds(
            collectStudentIds(rows),
          )
        : new Set<string>();

    return this.validationService.validate(
      rows,
      type,
      existingEmails,
      existingStudentIds,
    );
  }

  /**
   * Inserts one batch of valid rows. Inserting users with
   * ON CONFLICT (email) DO NOTHING makes re-runs idempotent: rows that
   * already landed in a previous attempt are simply not returned, and the
   * corresponding detail rows are skipped with them.
   */
  private async writeBatch(
    rows: NormalizedRow[],
    type: ImportType,
    organizationId: string,
  ): Promise<number> {
    const userRows = rows.map((row) => ({
      id: `user_${nanoid(20)}`,
      name: row.name,
      email: row.email,
      role: type === 'student' ? AppRole.Student : AppRole.Instructor,
      status: UserStatus.Active,
      organizationId,
    }));

    const created = await this.db
      .insert(user)
      .values(userRows)
      .onConflictDoNothing()
      .returning({ id: user.id, email: user.email });

    if (created.length === 0) return 0;

    const userIdByEmail = new Map(created.map((item) => [item.email, item.id]));
    const createdRows = rows.filter((row) => userIdByEmail.has(row.email));

    await this.insertAccounts(createdRows, userIdByEmail);
    await this.insertDetails(createdRows, userIdByEmail, type);
    await this.insertProfiles(createdRows, userIdByEmail);

    return createdRows.length;
  }

  private async insertAccounts(
    rows: NormalizedRow[],
    userIdByEmail: Map<string, string>,
  ): Promise<void> {
    if (rows.length === 0) return;

    // No password is stored for imported users — they must set one via the
    // forgot-password flow. The credential account row is still created so
    // better-auth can resolve the account when the password is set.
    await this.db
      .insert(account)
      .values(
        rows.map((row) => ({
          id: `account_${nanoid(20)}`,
          userId: userIdByEmail.get(row.email)!,
          accountId: row.email,
          providerId: 'credential',
          password: null,
        })),
      )
      .onConflictDoNothing();
  }

  private async insertDetails(
    rows: NormalizedRow[],
    userIdByEmail: Map<string, string>,
    type: ImportType,
  ): Promise<void> {
    if (rows.length === 0) return;

    if (type === 'student') {
      await this.db
        .insert(student)
        .values(
          rows.map((row) => ({
            userId: userIdByEmail.get(row.email)!,
            studentId: row.studentId ?? null,
          })),
        )
        .onConflictDoNothing({ target: student.userId });
      return;
    }

    await this.db
      .insert(teacher)
      .values(
        rows.map((row) => ({
          userId: userIdByEmail.get(row.email)!,
          title: row.title ?? null,
          joinDate: row.joinDate ?? null,
        })),
      )
      .onConflictDoNothing({ target: teacher.userId });
  }

  private async insertProfiles(
    rows: NormalizedRow[],
    userIdByEmail: Map<string, string>,
  ): Promise<void> {
    const withPhone = rows.filter((row) => row.phone);
    if (withPhone.length === 0) return;

    await this.db
      .insert(userProfile)
      .values(
        withPhone.map((row) => ({
          userId: userIdByEmail.get(row.email)!,
          phone: row.phone,
        })),
      )
      .onConflictDoNothing({ target: userProfile.userId });
  }

  private async finish(
    jobId: string,
    status: 'partial' | 'completed',
    outcome: ValidationOutcome,
    imported: number,
  ): Promise<void> {
    let errorFileKey: string | null = null;

    if (outcome.issues.length > 0) {
      const upload = await this.storageService.uploadFile(
        this.toMulterFile(
          `import-errors-${jobId}.csv`,
          this.buildErrorCsv(outcome.issues),
        ),
        IMPORT_DEFAULTS.errorFolder,
      );
      errorFileKey = upload.url.replace(UPLOADS_PREFIX, '');
    }

    const importJob = await this.jobRepository.patch(jobId, {
      status,
      imported,
      errorFileKey,
      error: null,
      processedAt: new Date(),
    });

    if (importJob) {
      await this.storageService
        .deleteFile(importJob.fileKey)
        .catch(() => undefined);
    }

    this.emitNotification(importJob, status, outcome, imported);
  }

  private buildErrorCsv(issues: ImportRowError[]): string {
    const lines = ['row,field,message'];
    for (const issue of issues) {
      lines.push(
        `${issue.row},${issue.field ?? ''},"${issue.message.replace(/"/g, '""')}"`,
      );
    }
    return lines.join('\n');
  }

  private toMulterFile(fileName: string, content: string): Express.Multer.File {
    const buffer = Buffer.from(content, 'utf-8');
    return {
      originalname: fileName,
      mimetype: 'text/csv',
      buffer,
      size: buffer.length,
    } as Express.Multer.File;
  }

  private emitNotification(
    importJob: SelectImportJob,
    status: 'partial' | 'completed',
    outcome: ValidationOutcome,
    imported: number,
  ): void {
    const isComplete = status === 'completed';
    const label = importJob.type === 'student' ? 'Student' : 'Teacher';

    this.eventEmitter.emit(
      NotificationCreatedEvent.signature,
      new NotificationCreatedEvent({
        title: `${label} import ${isComplete ? 'completed' : 'finished with errors'}`,
        content: `${imported} imported, ${outcome.skippedCount} skipped, ${outcome.failedCount} failed`,
        type: isComplete
          ? NotificationType.IMPORT.COMPLETED
          : NotificationType.IMPORT.FINISHED_WITH_ERRORS,
        organizationId: importJob.organizationId,
        recipientId: importJob.createdById,
        actorId: importJob.createdById,
        entityId: importJob.id,
      }),
    );
  }

  private async handleProcessError(
    job: Job<ImportJobPayload>,
    error: unknown,
  ): Promise<unknown> {
    const { jobId } = job.data;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Import job ${jobId} failed: ${message}`);

    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (isFinalAttempt) {
      await this.jobRepository.patch(jobId, {
        status: 'failed',
        error: message,
      });

      this.eventEmitter.emit(
        NotificationCreatedEvent.signature,
        new NotificationCreatedEvent({
          title: 'Import failed',
          content: message,
          type: NotificationType.IMPORT.FAILED,
          organizationId: job.data.organizationId,
          recipientId: job.data.createdById,
          actorId: job.data.createdById,
          entityId: jobId,
        }),
      );
    }

    throw error;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Import job ${job.id} failed: ${error.message}`);
  }
}
