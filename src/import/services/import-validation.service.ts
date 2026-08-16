import { Injectable } from '@nestjs/common';
import type { ImportType } from '../import.constants';
import { NormalizedRow, RowIssue } from '../interfaces/import-job.interface';

export interface ValidationOutcome {
  validRows: NormalizedRow[];
  issues: RowIssue[];
  failedCount: number;
  skippedCount: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,19}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class ImportValidationService {
  validate(
    rawRows: Record<string, string>[],
    type: ImportType,
    existingEmails: Set<string>,
    existingStudentIds: Set<string>,
  ): ValidationOutcome {
    this.assertRequiredColumns(rawRows);

    const validRows: NormalizedRow[] = [];
    const issues: RowIssue[] = [];
    const seenEmails = new Set<string>();
    const seenStudentIds = new Set<string>();

    rawRows.forEach((raw, index) => {
      const rowNumber = index + 2; // +1 header, +1 zero-based
      const row: NormalizedRow = { rowNumber, name: '', email: '' };

      row.name = this.clean(raw.name);
      row.email = this.clean(raw.email).toLowerCase();

      if (!row.name || row.name.length < 2) {
        issues.push(
          this.error(rowNumber, 'name', 'Name is required (min 2 characters)'),
        );
        return;
      }
      if (row.name.length > 120) {
        issues.push(
          this.error(rowNumber, 'name', 'Name must be 120 characters or fewer'),
        );
        return;
      }
      if (!EMAIL_PATTERN.test(row.email)) {
        issues.push(this.error(rowNumber, 'email', 'Invalid email address'));
        return;
      }
      if (seenEmails.has(row.email)) {
        issues.push(
          this.skip(rowNumber, 'email', 'Duplicate email within file'),
        );
        return;
      }

      if (type === 'student') {
        const studentId = this.clean(raw.studentId);
        if (studentId) {
          if (studentId.length > 64) {
            issues.push(
              this.error(
                rowNumber,
                'studentId',
                'Student ID must be 64 characters or fewer',
              ),
            );
            return;
          }
          if (seenStudentIds.has(studentId)) {
            issues.push(
              this.skip(
                rowNumber,
                'studentId',
                'Duplicate student ID within file',
              ),
            );
            return;
          }
          if (existingStudentIds.has(studentId)) {
            issues.push(
              this.skip(rowNumber, 'studentId', 'Student ID already exists'),
            );
            return;
          }
          seenStudentIds.add(studentId);
          row.studentId = studentId;
        }
      }

      if (existingEmails.has(row.email)) {
        issues.push(this.skip(rowNumber, 'email', 'Email already exists'));
        return;
      }

      seenEmails.add(row.email);

      row.phone = this.validateOptional(
        raw.phone,
        PHONE_PATTERN,
        rowNumber,
        'phone',
        'Phone must be digits, spaces, dashes, parentheses or a leading +',
        issues,
      );

      if (type === 'teacher') {
        row.title = this.validateOptional(
          raw.title,
          /^.{0,64}$/,
          rowNumber,
          'title',
          'Title must be 64 characters or fewer',
          issues,
        );

        row.joinDate = this.validateOptional(
          raw.joinDate,
          DATE_PATTERN,
          rowNumber,
          'joinDate',
          'Join date must be in YYYY-MM-DD format',
          issues,
        );
      }

      validRows.push(row);
    });

    const failedCount = issues.filter(
      (issue) => issue.kind === 'failed',
    ).length;
    const skippedCount = issues.filter(
      (issue) => issue.kind === 'skipped',
    ).length;

    return { validRows, issues, failedCount, skippedCount };
  }

  private assertRequiredColumns(rawRows: Record<string, string>[]): void {
    if (rawRows.length === 0) return;

    const hasEmail = rawRows.some((row) => this.clean(row.email).length > 0);
    const hasName = rawRows.some((row) => this.clean(row.name).length > 0);

    if (!hasEmail || !hasName) {
      const missing = [hasName ? null : 'name', hasEmail ? null : 'email']
        .filter(Boolean)
        .join(' and ');
      throw new Error(`Required column(s) missing from file: ${missing}`);
    }
  }

  private validateOptional(
    raw: string | undefined,
    pattern: RegExp,
    rowNumber: number,
    field: string,
    message: string,
    issues: RowIssue[],
  ): string | undefined {
    const value = this.clean(raw);
    if (!value) return undefined;
    if (!pattern.test(value)) {
      issues.push({ row: rowNumber, field, message, severity: 'warning' });
      return undefined;
    }
    return value;
  }

  private error(row: number, field: string, message: string): RowIssue {
    return { row, field, message, severity: 'error', kind: 'failed' };
  }

  private skip(row: number, field: string, message: string): RowIssue {
    return { row, field, message, severity: 'error', kind: 'skipped' };
  }

  private clean(value: string | undefined): string {
    return (value ?? '').trim();
  }
}
