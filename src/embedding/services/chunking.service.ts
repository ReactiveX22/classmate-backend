import { RecursiveCharacterTextSplitter } from '@langchain/classic/text_splitter';
import type { Document } from '@langchain/core/documents';
import { Injectable, Logger } from '@nestjs/common';
import { EMBEDDING_DEFAULTS } from '../embedding.constants';

export type DocumentChunk = {
  index: number;
  text: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * Splits LangChain Documents into smaller chunks based on configured defaults.
   */
  async chunkDocuments(
    documents: Document[],
    options: {
      chunkSize?: number;
      chunkOverlap?: number;
      maxChunks?: number;
    } = {},
  ): Promise<DocumentChunk[]> {
    const chunkSize = options.chunkSize ?? EMBEDDING_DEFAULTS.chunkSize;
    const chunkOverlap =
      options.chunkOverlap ?? EMBEDDING_DEFAULTS.chunkOverlap;
    const maxChunks =
      options.maxChunks ?? EMBEDDING_DEFAULTS.maxChunksPerAttachment;

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    const splitDocs = await splitter.splitDocuments(documents);

    if (splitDocs.length > maxChunks) {
      this.logger.warn(
        `Document produced ${splitDocs.length} chunks, which exceeds the limit of ${maxChunks}. Truncating.`,
      );
    }

    return splitDocs.slice(0, maxChunks).map((doc, index) => ({
      index,
      text: doc.pageContent,
      metadata: {
        ...doc.metadata,
        chunkIndex: index,
        chunkCount: Math.min(splitDocs.length, maxChunks),
      },
    }));
  }

  /**
   * Estimates token count for a given text.
   * Simple character-based estimation for Phase 1.
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
