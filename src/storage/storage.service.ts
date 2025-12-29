import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import path from 'path';

export interface UploadResult {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'image' | 'video' | 'link';
  size: number;
  mimeType: string;
}

@Injectable()
export class StorageService {
  private uploadDir: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // Store files in uploads folder at project root
    this.uploadDir = path.join(process.cwd(), 'uploads');
    // Base URL for accessing files
    this.baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');

    // Ensure upload directory exists
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
      console.error('Error deleting file:', error);
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
      console.error('Error in bulk deletion:', error);
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
