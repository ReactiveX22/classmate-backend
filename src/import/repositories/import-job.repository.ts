import { Injectable } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import { type DB, InjectDb } from 'src/database/db.provider';
import { importJob, student, user, SelectImportJob } from 'src/database/schema';
import type { ImportType } from '../import.constants';
import type { ImportRowError } from 'src/database/schema/import-job-schema';

type ImportJobStatus = SelectImportJob['status'];

export interface ImportJobPatch {
  status?: ImportJobStatus;
  total?: number;
  imported?: number;
  skipped?: number;
  failed?: number;
  errorSummary?: ImportRowError[];
  errorFileKey?: string | null;
  error?: string | null;
  processedAt?: Date | null;
}

@Injectable()
export class ImportJobRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: {
    organizationId: string;
    type: ImportType;
    fileName: string;
    fileKey: string;
    createdById: string;
  }) {
    const [created] = await this.db.insert(importJob).values(data).returning();
    return created;
  }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(importJob)
      .where(eq(importJob.id, id))
      .limit(1);
    return result || null;
  }

  async patch(id: string, data: ImportJobPatch) {
    const [updated] = await this.db
      .update(importJob)
      .set(data)
      .where(eq(importJob.id, id))
      .returning();
    return updated || null;
  }

  async incrementImported(id: string, count: number) {
    await this.db
      .update(importJob)
      .set({ imported: sql`${importJob.imported} + ${count}` })
      .where(eq(importJob.id, id));
  }

  async findExistingEmails(emails: string[]): Promise<Set<string>> {
    if (emails.length === 0) return new Set();
    const results = await this.db
      .select({ email: user.email })
      .from(user)
      .where(inArray(user.email, emails));
    return new Set(results.map((result) => result.email));
  }

  async findExistingStudentIds(studentIds: string[]): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();
    const results = await this.db
      .select({ studentId: student.studentId })
      .from(student)
      .where(inArray(student.studentId, studentIds));
    return new Set(
      results
        .map((result) => result.studentId)
        .filter((id): id is string => id !== null),
    );
  }
}
