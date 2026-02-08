import { Response } from 'express';

export const STORAGE_STRATEGY = 'STORAGE_STRATEGY';

export interface StorageStrategy {
  uploadFile(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<UploadResult[]>;
  deleteFile(filePath: string): Promise<void>;
  deleteFiles(folderPath: string, fileIds: string[]): Promise<void>;
  deleteDirectory(folderPath: string): Promise<void>;
  getFileUrl(folder: string, fileName: string): string;
  fileExists(folder: string, fileName: string): Promise<boolean>;
  serveFile(folder: string, fileName: string, res: Response): Promise<void>;
}

export interface UploadResult {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'image' | 'video' | 'link';
  size: number;
  mimeType: string;
}
