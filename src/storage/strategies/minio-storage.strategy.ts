import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import * as path from 'path';
import { ApplicationNotFoundException } from '../../common/exceptions/application.exception';
import type {
  StorageStrategy,
  UploadResult,
} from '../interfaces/storage-strategy.interface';

export class MinioStorageStrategy implements StorageStrategy {
  private readonly logger = new Logger(MinioStorageStrategy.name);
  private readonly s3Client: S3Client;

  constructor(
    private readonly endpoint: string,
    private readonly region: string,
    private readonly accessKey: string,
    private readonly secretKey: string,
    private readonly bucket: string,
    private readonly appUrl: string,
  ) {
    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.logger.log(
      `MinIO storage initialized with endpoint: ${this.endpoint}`,
    );
  }

  private async uploadToS3(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    const fileName = `${fileId}${ext}`;
    const key = `${folder}/${fileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.appUrl}/api/v1/uploads/${key}`;

    this.logger.log(`File uploaded to MinIO: ${key}`);

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
    return this.uploadToS3(file, folder);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'attachments',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map((file) => this.uploadToS3(file, folder));
    return await Promise.all(uploadPromises);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
      );
      this.logger.log(`File deleted from MinIO: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error deleting file from MinIO: ${filePath}`, error);
    }
  }

  async deleteFiles(folderPath: string, fileIds: string[]): Promise<void> {
    try {
      // List objects in the folder to find matching files
      const listResponse = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: folderPath,
        }),
      );

      const idSet = new Set(fileIds);
      const keysToDelete =
        listResponse.Contents?.filter((obj) => {
          if (!obj.Key) return false;
          const fileName = path.basename(obj.Key);
          const fileId = path.parse(fileName).name;
          return idSet.has(fileId) || idSet.has(fileName);
        }).map((obj) => ({ Key: obj.Key })) || [];

      if (keysToDelete.length > 0) {
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: keysToDelete },
          }),
        );
        this.logger.log(
          `Deleted ${keysToDelete.length} files from MinIO in ${folderPath}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in bulk deletion from MinIO:', error);
    }
  }

  async deleteDirectory(folderPath: string): Promise<void> {
    try {
      // List all objects with the folder prefix
      const listResponse = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: folderPath,
        }),
      );

      const keysToDelete =
        listResponse.Contents?.map((obj) => ({ Key: obj.Key })) || [];

      if (keysToDelete.length > 0) {
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: keysToDelete },
          }),
        );
        this.logger.log(
          `Deleted directory from MinIO: ${folderPath} (${keysToDelete.length} objects)`,
        );
      }
    } catch (error) {
      this.logger.error('Error deleting directory from MinIO:', error);
    }
  }

  getFileUrl(folder: string, fileName: string): string {
    return `${this.appUrl}/api/v1/uploads/${folder}/${fileName}`;
  }

  async fileExists(folder: string, fileName: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: `${folder}/${fileName}`,
        }),
      );
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
    const exists = await this.fileExists(folder, fileName);
    if (!exists) {
      throw new ApplicationNotFoundException(
        'File not found',
        'RESOURCE_NOT_FOUND',
      );
    }

    const key = `${folder}/${fileName}`;
    const signedUrl = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );
    res.redirect(signedUrl);
  }

  private getAttachmentType(
    mimeType: string,
  ): 'file' | 'image' | 'video' | 'link' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'file';
  }
}
