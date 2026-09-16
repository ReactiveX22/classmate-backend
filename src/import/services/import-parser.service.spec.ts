import * as ExcelJS from 'exceljs';
import { ApplicationBadRequestException } from 'src/common/exceptions/application.exception';
import { ImportParserService } from './import-parser.service';

describe('ImportParserService', () => {
  let service: ImportParserService;

  beforeEach(() => {
    service = new ImportParserService();
  });

  describe('parse CSV', () => {
    it('parses rows and canonicalizes header aliases', async () => {
      const csv =
        'Full Name,Email Address,Phone Number\n  Alice Smith  ,alice@example.com,+1 555 123 4567\n';

      const { rows } = await service.parse(Buffer.from(csv), 'students.csv');

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '+1 555 123 4567',
      });
    });

    it('normalizes student id aliases', async () => {
      const csv = 'name,email,roll no\nBob,bob@example.com,STU-01\n';

      const { rows } = await service.parse(Buffer.from(csv), 'students.csv');

      expect(rows[0].studentId).toBe('STU-01');
    });

    it('rejects binary content in a csv file', async () => {
      const binary = Buffer.from([0x00, 0x01, 0x02, 0x03]);

      await expect(service.parse(binary, 'students.csv')).rejects.toThrow(
        ApplicationBadRequestException,
      );
    });

    it('rejects a csv with no data rows', async () => {
      await expect(
        service.parse(Buffer.from('name,email\n'), 'students.csv'),
      ).rejects.toThrow('no data rows');
    });

    it('rejects an unsupported extension', async () => {
      await expect(
        service.parse(Buffer.from('name,email\nx,y\n'), 'students.xls'),
      ).rejects.toThrow('Unsupported file type');
    });
  });

  describe('parse XLSX', () => {
    async function buildWorkbook(rows: string[][]): Promise<Buffer> {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      rows.forEach((row) => worksheet.addRow(row));
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    it('parses rows and canonicalizes header aliases', async () => {
      const buffer = await buildWorkbook([
        ['Student Name', 'Email Address', 'Phone Number'],
        ['Bob', 'bob@example.com', '555-0100'],
      ]);

      const { rows } = await service.parse(buffer, 'students.xlsx');

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        name: 'Bob',
        email: 'bob@example.com',
        phone: '555-0100',
      });
    });

    it('rejects a workbook with no data rows', async () => {
      const buffer = await buildWorkbook([['name', 'email']]);

      await expect(service.parse(buffer, 'students.xlsx')).rejects.toThrow(
        'no data rows',
      );
    });
  });
});
