import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  StorageStrategy,
  UploadResult,
} from '../interfaces/storage-strategy.interface';

export class LocalStorageStrategy implements StorageStrategy {
  private readonly logger = new Logger(LocalStorageStrategy.name);
  private readonly uploadDir: string;

  constructor(private readonly baseUrl: string) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  private async saveFileToDisk(
    file: Express.Multer.File,
    folderPath: string,
  ): Promise<UploadResult> {
    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    const fileName = `${fileId}${ext}`;
    const filePath = path.join(folderPath, fileName);

    await fs.writeFile(filePath, file.buffer);

    const relativeFolder = path
      .relative(this.uploadDir, folderPath)
      .replace(/\\/g, '/');
    const url = `${this.baseUrl}/api/v1/uploads/${relativeFolder}/${fileName}`;

    return {
      id: fileId,
      name: file.originalname,
      url,
      type: this.getAttachmentType(file.mimetype),
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'attachments',
  ): Promise<UploadResult> {
    const folderPath = path.join(this.uploadDir, folder);
    await fs.mkdir(folderPath, { recursive: true });

    return this.saveFileToDisk(file, folderPath);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'attachments',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) return [];

    const folderPath = path.join(this.uploadDir, folder);
    await fs.mkdir(folderPath, { recursive: true });

    const uploadPromises = files.map((file) =>
      this.saveFileToDisk(file, folderPath),
    );

    return await Promise.all(uploadPromises);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(this.uploadDir, filePath);
      const directory = path.dirname(absolutePath);
      const fileNameToMatch = path.basename(absolutePath);

      const files = await fs.readdir(directory);

      const filesToDelete = files.filter((file) => {
        return (
          file === fileNameToMatch || file.startsWith(`${fileNameToMatch}.`)
        );
      });

      for (const file of filesToDelete) {
        await fs.unlink(path.join(directory, file));
      }
    } catch (error) {
      this.logger.error('Error deleting file:', error);
    }
  }

  async deleteFiles(folderPath: string, fileIds: string[]): Promise<void> {
    try {
      const directory = path.resolve(this.uploadDir, folderPath);
      const files = await fs.readdir(directory);

      const idSet = new Set(fileIds);

      const deletionPromises = files
        .filter((file) => {
          const fileId = path.parse(file).name;
          return idSet.has(fileId) || idSet.has(file);
        })
        .map((file) => fs.unlink(path.join(directory, file)));

      await Promise.all(deletionPromises);
    } catch (error) {
      this.logger.error('Error in bulk deletion:', error);
    }
  }

  async deleteDirectory(folderPath: string): Promise<void> {
    try {
      const directory = path.resolve(this.uploadDir, folderPath);
      await fs.rm(directory, { recursive: true, force: true });
    } catch (error) {
      this.logger.error('Error deleting directory:', error);
    }
  }

  getFileUrl(folder: string, fileName: string): string {
    return `${this.baseUrl}/api/v1/uploads/${folder}/${fileName}`;
  }

  async fileExists(folder: string, fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, folder, fileName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async serveFile(
    folder: string,
    fileName: string,
    res: Response,
  ): Promise<void> {
    const filePath = path.join(this.uploadDir, folder, fileName);

    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ message: 'File not found' });
    }
  }

  private getAttachmentType(
    mimeType: string,
  ): 'file' | 'image' | 'video' | 'link' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'file';
  }
}
