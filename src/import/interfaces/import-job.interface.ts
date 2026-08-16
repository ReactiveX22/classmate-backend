import type { ImportType } from '../import.constants';

export interface ImportJobPayload {
  jobId: string;
  organizationId: string;
  type: ImportType;
  fileKey: string;
  createdById: string;
}

export interface NormalizedRow {
  rowNumber: number;
  name: string;
  email: string;
  phone?: string;
  studentId?: string;
  title?: string;
  joinDate?: string;
}

export interface RowIssue {
  row: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  kind?: 'skipped' | 'failed';
}

export interface ValidationResult {
  rows: NormalizedRow[];
  issues: RowIssue[];
  total: number;
  existingEmails: Set<string>;
  existingStudentIds: Set<string>;
}
