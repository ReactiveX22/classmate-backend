import { Inject, Injectable } from '@nestjs/common';
import { Response } from 'express';
import {
  STORAGE_STRATEGY,
  type StorageStrategy,
  type UploadResult,
} from './interfaces/storage-strategy.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_STRATEGY)
    private readonly strategy: StorageStrategy,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'attachments',
  ): Promise<UploadResult> {
    return this.strategy.uploadFile(file, folder);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'attachments',
  ): Promise<UploadResult[]> {
    return this.strategy.uploadFiles(files, folder);
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.strategy.deleteFile(filePath);
  }

  async deleteFiles(folderPath: string, fileIds: string[]): Promise<void> {
    return this.strategy.deleteFiles(folderPath, fileIds);
  }

  async deleteDirectory(folderPath: string): Promise<void> {
    return this.strategy.deleteDirectory(folderPath);
  }

  getFileUrl(folder: string, fileName: string): string {
    return this.strategy.getFileUrl(folder, fileName);
  }

  async fileExists(folder: string, fileName: string): Promise<boolean> {
    return this.strategy.fileExists(folder, fileName);
  }

  async serveFile(
    folder: string,
    fileName: string,
    res: Response,
  ): Promise<void> {
    return this.strategy.serveFile(folder, fileName, res);
  }
}
