import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import {
  ApplicationBadRequestException,
  ApplicationConflictException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { StorageService } from 'src/storage/storage.service';
import {
  IMPORT_DEFAULTS,
  IMPORT_HEADERS,
  type ImportType,
} from '../import.constants';
import { ImportJobRepository } from '../repositories/import-job.repository';
import { capIssues, collectEmails, collectStudentIds } from '../utils/row.util';
import { ImportJobService } from './import-job.service';
import { ImportParserService } from './import-parser.service';
import { ImportValidationService } from './import-validation.service';

const UPLOADS_PREFIX = '/api/v1/uploads/';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly parserService: ImportParserService,
    private readonly validationService: ImportValidationService,
    private readonly jobRepository: ImportJobRepository,
    private readonly jobService: ImportJobService,
  ) {}

  async previewFile(
    organizationId: string,
    createdById: string,
    type: ImportType,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new ApplicationBadRequestException(
        'No file uploaded',
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }

    if (file.size > IMPORT_DEFAULTS.maxFileBytes) {
      throw new ApplicationBadRequestException(
        'File is too large. Maximum size is 10MB',
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }

    const upload = await this.storageService.uploadFile(
      file,
      IMPORT_DEFAULTS.previewFolder,
    );
    const fileKey = upload.url.replace(UPLOADS_PREFIX, '');

    try {
      const { rows } = await this.parserService.parse(
        file.buffer,
        file.originalname,
      );

      const existingEmails = await this.jobRepository.findExistingEmails(
        collectEmails(rows),
      );
      const existingStudentIds =
        type === 'student'
          ? await this.jobRepository.findExistingStudentIds(
              collectStudentIds(rows),
            )
          : new Set<string>();

      const outcome = this.validationService.validate(
        rows,
        type,
        existingEmails,
        existingStudentIds,
      );

      const job = await this.jobRepository.create({
        organizationId,
        type,
        fileName: file.originalname,
        fileKey,
        createdById,
      });

      await this.jobRepository.patch(job.id, {
        total:
          outcome.validRows.length + outcome.failedCount + outcome.skippedCount,
        skipped: outcome.skippedCount,
        failed: outcome.failedCount,
        errorSummary: capIssues(outcome.issues),
      });

      return {
        previewId: job.id,
        status: job.status,
        fileName: job.fileName,
        total:
          outcome.validRows.length + outcome.failedCount + outcome.skippedCount,
        valid: outcome.validRows.length,
        skipped: outcome.skippedCount,
        failed: outcome.failedCount,
        errorSummary: capIssues(outcome.issues),
      };
    } catch (error) {
      await this.storageService.deleteFile(fileKey).catch(() => undefined);
      throw error;
    }
  }

  async confirm(
    organizationId: string,
    createdById: string,
    type: ImportType,
    previewId: string,
  ) {
    const job = await this.jobRepository.findById(previewId);

    if (!job || job.organizationId !== organizationId) {
      throw new ApplicationNotFoundException(
        'Preview not found',
        ERROR_CODES.INFRA.RESOURCE_NOT_FOUND,
      );
    }

    if (job.type !== type) {
      throw new ApplicationBadRequestException(
        `Preview was created for ${job.type} import, not ${type}`,
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }

    if (job.status !== 'draft') {
      throw new ApplicationConflictException(
        'This preview has already been confirmed',
        ERROR_CODES.INFRA.BAD_REQUEST,
      );
    }

    if (Date.now() - job.createdAt.getTime() > IMPORT_DEFAULTS.previewTtlMs) {
      throw new ApplicationConflictException(
        'Preview has expired. Please upload the file again',
        ERROR_CODES.INFRA.BAD_REQUEST,
      );
    }

    await this.jobRepository.patch(job.id, { status: 'pending' });
    await this.jobService.enqueueImport({
      jobId: job.id,
      organizationId,
      type,
      fileKey: job.fileKey,
      createdById,
    });

    return { jobId: job.id, status: 'pending' };
  }

  async getJobStatus(organizationId: string, jobId: string) {
    const job = await this.jobRepository.findById(jobId);

    if (!job || job.organizationId !== organizationId) {
      throw new ApplicationNotFoundException(
        'Import job not found',
        ERROR_CODES.INFRA.RESOURCE_NOT_FOUND,
      );
    }

    const processed = job.imported + job.skipped + job.failed;
    const progress =
      job.total > 0
        ? Math.min(100, Math.round((processed / job.total) * 100))
        : 0;

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      fileName: job.fileName,
      total: job.total,
      imported: job.imported,
      skipped: job.skipped,
      failed: job.failed,
      progress,
      errorSummary: job.errorSummary,
      errorFileUrl: job.errorFileKey
        ? this.errorFileUrl(job.errorFileKey)
        : null,
      createdAt: job.createdAt,
      processedAt: job.processedAt,
    };
  }

  async getJobErrors(organizationId: string, jobId: string, res: Response) {
    const job = await this.jobRepository.findById(jobId);

    if (!job || job.organizationId !== organizationId) {
      throw new ApplicationNotFoundException(
        'Import job not found',
        ERROR_CODES.INFRA.RESOURCE_NOT_FOUND,
      );
    }

    if (!job.errorFileKey) {
      throw new ApplicationNotFoundException(
        'No error report for this import',
        ERROR_CODES.INFRA.RESOURCE_NOT_FOUND,
      );
    }

    const separator = job.errorFileKey.lastIndexOf('/');
    await this.storageService.serveFile(
      job.errorFileKey.slice(0, separator),
      job.errorFileKey.slice(separator + 1),
      res,
    );
  }

  buildTemplate(type: ImportType): string {
    const headers =
      type === 'student'
        ? Object.values(IMPORT_HEADERS.student)
        : Object.values(IMPORT_HEADERS.teacher);

    const example =
      type === 'student'
        ? ['John Doe', 'john.doe@example.com', '+1 555 123 4567', 'STU-0001']
        : [
            'Jane Smith',
            'jane.smith@example.com',
            '+1 555 987 6543',
            'Dr.',
            '2024-01-15',
          ];

    return [headers.join(','), example.join(',')].join('\n');
  }

  private errorFileUrl(fileKey: string): string {
    return `${UPLOADS_PREFIX}${fileKey}`;
  }
}
