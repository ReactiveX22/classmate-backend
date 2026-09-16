import { Injectable, Logger } from '@nestjs/common';
import * as csv from 'fast-csv';
import * as ExcelJS from 'exceljs';
import {
  ALLOWED_IMPORT_EXTENSIONS,
  IMPORT_ALIASES,
  IMPORT_DEFAULTS,
} from '../import.constants';
import { ApplicationBadRequestException } from '../../common/exceptions/application.exception';
import { ERROR_CODES } from '../../common/constants/error.codes';

export interface ParsedFile {
  rows: Record<string, string>[];
}

@Injectable()
export class ImportParserService {
  private readonly logger = new Logger(ImportParserService.name);

  async parse(buffer: Buffer, fileName: string): Promise<ParsedFile> {
    const extension = this.getExtension(fileName);
    this.assertAllowedExtension(extension);

    if (extension === '.csv') {
      this.assertPlainText(buffer);
      return this.parseCsv(buffer);
    }

    return this.parseXlsx(buffer);
  }

  private getExtension(fileName: string): string {
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    if (!extension) {
      throw new ApplicationBadRequestException(
        'File must have an extension (.csv or .xlsx)',
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }
    return extension;
  }

  private assertAllowedExtension(extension: string): void {
    if (!(ALLOWED_IMPORT_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new ApplicationBadRequestException(
        `Unsupported file type "${extension}". Please upload a .csv or .xlsx file`,
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }
  }

  /**
   * File magic bytes are validated upstream by NestJS's FileTypeValidator
   * (which sniffs them via file-type). Plain CSV has no magic bytes, so here we
   * only guard against binary content masquerading as CSV.
   */
  private assertPlainText(buffer: Buffer): void {
    if (buffer.includes(0)) {
      throw new ApplicationBadRequestException(
        'File appears to be binary. Please upload a plain-text .csv file',
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }
  }

  private async parseCsv(buffer: Buffer): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];

      csv
        .parseString(buffer.toString(), {
          headers: true,
          trim: true,
          ignoreEmpty: true,
        })
        .on('error', (error) => {
          reject(
            new ApplicationBadRequestException(
              `Failed to parse CSV: ${error.message}`,
              ERROR_CODES.INFRA.INPUT_VALIDATION,
            ),
          );
        })
        .on('data', (row: Record<string, unknown>) => {
          if (rows.length >= IMPORT_DEFAULTS.maxRows) return;
          rows.push(this.normalizeRow(row));
        })
        .on('end', () => {
          if (rows.length === 0) {
            reject(
              new ApplicationBadRequestException(
                'The CSV file contains no data rows',
                ERROR_CODES.INFRA.INPUT_VALIDATION,
              ),
            );
            return;
          }
          resolve({ rows });
        });
    });
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedFile> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(this.toArrayBuffer(buffer));

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new ApplicationBadRequestException(
          'The workbook contains no sheets',
          ERROR_CODES.INFRA.INPUT_VALIDATION,
        );
      }

      const rows: Record<string, string>[] = [];
      let headerRow: string[] | null = null;

      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const values = this.rowValues(row);
        if (values.length === 0) return;

        if (!headerRow) {
          headerRow = values;
          return;
        }

        if (rows.length >= IMPORT_DEFAULTS.maxRows) return;
        rows.push(this.mapRow(headerRow, values));
      });

      if (!headerRow) {
        throw new ApplicationBadRequestException(
          'The spreadsheet is empty',
          ERROR_CODES.INFRA.INPUT_VALIDATION,
        );
      }

      if (rows.length === 0) {
        throw new ApplicationBadRequestException(
          'The spreadsheet contains no data rows',
          ERROR_CODES.INFRA.INPUT_VALIDATION,
        );
      }

      return { rows };
    } catch (error) {
      if (error instanceof ApplicationBadRequestException) throw error;
      this.logger.error('Failed to parse xlsx workbook', error);
      throw new ApplicationBadRequestException(
        'Failed to read the .xlsx file. Make sure it is a valid Excel workbook',
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }
  }

  /**
   * exceljs declares its own `Buffer` type (an empty interface extending
   * ArrayBuffer), which is incompatible with the global Buffer since TS 5.7.
   * Hand it a real ArrayBuffer view of the exact bytes instead.
   * See https://github.com/exceljs/exceljs/issues/2877
   */
  private toArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
  }

  private rowValues(row: ExcelJS.Row): string[] {
    const values: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      values.push(this.cellToString(cell.value));
    });
    return values;
  }

  private cellToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
        return String(value).trim();
      default: {
        const text = (value as { text?: unknown }).text;
        return typeof text === 'string' || typeof text === 'number'
          ? String(text).trim()
          : '';
      }
    }
  }

  private mapRow(
    headerRow: string[],
    values: string[],
  ): Record<string, string> {
    const row: Record<string, string> = {};
    headerRow.forEach((header, index) => {
      const canonical = this.canonicalizeHeader(header);
      if (canonical && values[index] !== undefined) {
        row[canonical] = values[index];
      }
    });
    return row;
  }

  private normalizeRow(row: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const canonical = this.canonicalizeHeader(key);
      if (canonical && typeof value === 'string') {
        result[canonical] = value.trim();
      }
    }
    return result;
  }

  private canonicalizeHeader(header: string): string | undefined {
    const normalized = header.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const [canonical, aliases] of Object.entries(IMPORT_ALIASES)) {
      if (normalized === canonical || aliases.includes(normalized)) {
        return canonical;
      }
    }
    return undefined;
  }
}
