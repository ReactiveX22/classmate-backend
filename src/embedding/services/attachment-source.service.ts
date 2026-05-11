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

    // Example URL: /api/v1/uploads/attachments/123-abc.pdf
    const prefix = '/api/v1/uploads/';
    if (!url.startsWith(prefix)) {
      throw new Error(`Unsupported attachment URL format: ${url}`);
    }

    const storagePath = url.slice(prefix.length);
    if (!storagePath || storagePath.includes('..')) {
      throw new Error(`Unsafe attachment storage path: ${storagePath}`);
    }

    return storagePath;
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
