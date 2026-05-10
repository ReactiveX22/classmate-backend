import { JSONLoader } from '@langchain/classic/document_loaders/fs/json';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import type { Document } from '@langchain/core/documents';
import { Injectable, Logger } from '@nestjs/common';
import type { Attachment } from '../../database/schema/types';
import { UnsupportedDocumentLoaderException } from '../exceptions/embedding.exception';
import { AttachmentSourceService } from './attachment-source.service';

@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);

  constructor(
    private readonly attachmentSourceService: AttachmentSourceService,
  ) {}

  /**
   * Loads an attachment into LangChain Documents.
   * Throws UnsupportedDocumentLoaderError if the file type is not supported.
   */
  async loadDocument(attachment: Attachment): Promise<Document[]> {
    const buffer = await this.attachmentSourceService.getFileBuffer(attachment);
    const blob = new Blob([new Uint8Array(buffer)], {
      type: attachment.mimeType,
    });

    switch (attachment.mimeType) {
      case 'application/pdf': {
        const loader = new PDFLoader(blob, { splitPages: true });
        return loader.load();
      }
      case 'text/plain':
      case 'text/markdown': {
        const loader = new TextLoader(blob);
        return loader.load();
      }
      case 'text/csv': {
        const loader = new CSVLoader(blob);
        return loader.load();
      }
      case 'application/json': {
        // Load JSON with pointers or simple extraction
        const loader = new JSONLoader(blob);
        return loader.load();
      }
      default:
        throw new UnsupportedDocumentLoaderException(
          attachment.mimeType ?? 'unknown',
        );
    }
  }
}
