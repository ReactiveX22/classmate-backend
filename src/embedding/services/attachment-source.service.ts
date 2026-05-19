import { Injectable, Logger } from '@nestjs/common';
import type { Attachment } from '../../database/schema/types';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class AttachmentSourceService {
  private readonly logger = new Logger(AttachmentSourceService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Resolves the internal storage path from the attachment URL.
   * Only internal uploads starting with `/api/v1/uploads/` are supported.
   * Throws if the path is unsafe or external.
   */
  resolveStoragePath(attachment: Attachment): string {
    if (attachment.type !== 'file') {
      throw new Error(`Unsupported attachment type: ${attachment.type}`);
    }

    const url = attachment.url;
    if (!url) {
      throw new Error('Attachment URL is missing');
    }

    const classroomPrefix = '/api/v1/uploads/';
    const noticePrefix = '/api/v1/uploads/notice-attachments/';

    if (url.startsWith(noticePrefix)) {
      const storagePath = url.slice(classroomPrefix.length);
      if (!storagePath || storagePath.includes('..')) {
        throw new Error(`Unsafe attachment storage path: ${storagePath}`);
      }
      return storagePath;
    }

    if (url.startsWith(classroomPrefix)) {
      const storagePath = url.slice(classroomPrefix.length);
      if (!storagePath || storagePath.includes('..')) {
        throw new Error(`Unsafe attachment storage path: ${storagePath}`);
      }
      return storagePath;
    }

    throw new Error(`Unsupported attachment URL format: ${url}`);
  }

  async getFileBuffer(attachment: Attachment): Promise<Buffer> {
    const storagePath = this.resolveStoragePath(attachment);
    return this.storageService.getFileBuffer(storagePath);
  }

  async getFileStream(attachment: Attachment): Promise<NodeJS.ReadableStream> {
    const storagePath = this.resolveStoragePath(attachment);
    return this.storageService.getFileStream(storagePath);
  }
}
