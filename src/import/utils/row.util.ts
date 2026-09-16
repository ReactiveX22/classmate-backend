import type { ImportRowError } from 'src/database/schema/import-job-schema';
import { IMPORT_DEFAULTS } from '../import.constants';

export function collectEmails(rows: Record<string, string>[]): string[] {
  return [
    ...new Set(
      rows
        .map((row) => (row.email ?? '').trim().toLowerCase())
        .filter((email) => email.length > 0),
    ),
  ];
}

export function collectStudentIds(rows: Record<string, string>[]): string[] {
  return [
    ...new Set(
      rows
        .map((row) => (row.studentId ?? '').trim())
        .filter((studentId) => studentId.length > 0),
    ),
  ];
}

export function capIssues(issues: ImportRowError[]): ImportRowError[] {
  return issues.slice(0, IMPORT_DEFAULTS.rowErrorCap);
}
