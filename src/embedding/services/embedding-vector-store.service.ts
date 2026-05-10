import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { Document } from '@langchain/core/documents';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL_TOKEN } from '../../database/db.provider';
import { EMBEDDING_DEFAULTS } from '../embedding.constants';
import { EmbeddingModelService } from './embedding-model.service';

@Injectable()
export class EmbeddingVectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingVectorStoreService.name);
  private vectorStore: PGVectorStore;

  constructor(
    @Inject(DB_POOL_TOKEN) private readonly pool: Pool,
    private readonly embeddingModelService: EmbeddingModelService,
  ) {}

  async onModuleInit() {
    try {
      this.vectorStore = await PGVectorStore.initialize(
        this.embeddingModelService.instance,
        {
          pool: this.pool,
          tableName: EMBEDDING_DEFAULTS.vectorTableName,
          collectionTableName: EMBEDDING_DEFAULTS.vectorCollectionTableName,
          collectionName: EMBEDDING_DEFAULTS.vectorCollectionName,
          columns: {
            idColumnName: 'id',
            vectorColumnName: 'vector',
            contentColumnName: 'content',
            metadataColumnName: 'metadata',
          },
          distanceStrategy: 'cosine',
        },
      );
      this.logger.log('Vector store initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize vector store',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Adds documents to the vector store.
   * If IDs are provided, they are used. Otherwise, LangChain generates random UUIDs.
   * Returns the IDs of the added documents.
   */
  async addDocuments(documents: Document[], ids?: string[]): Promise<void> {
    await this.vectorStore.addDocuments(documents, { ids });
  }

  /**
   * Deletes documents by their deterministic IDs.
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.vectorStore.delete({ ids });
  }

  /**
   * Performs a similarity search with filtering support.
   */
  async similaritySearch(
    query: string,
    limit = 5,
    filter?: PGVectorStore['FilterType'],
  ) {
    return this.vectorStore.similaritySearch(query, limit, filter);
  }

  /**
   * Performs a similarity search and returns scores.
   */
  async similaritySearchWithScore(
    query: string,
    limit = 5,
    filter?: PGVectorStore['FilterType'],
  ) {
    return this.vectorStore.similaritySearchWithScore(query, limit, filter);
  }
}
