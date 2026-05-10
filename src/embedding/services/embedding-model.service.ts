import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmbeddingConfigurationException,
  EmbeddingModelException,
} from '../exceptions/embedding.exception';

@Injectable()
export class EmbeddingModelService implements OnModuleInit {
  private _model: GoogleGenerativeAIEmbeddings;
  private _modelName: string;
  private _providerName: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    this._modelName = this.configService.get<string>(
      'AI_EMBEDDING_MODEL',
      'gemini-embedding-2',
    );
    this._providerName = this.configService.get<string>(
      'AI_EMBEDDING_PROVIDER',
      'google',
    );

    if (!apiKey) {
      throw new EmbeddingConfigurationException(
        'GOOGLE_API_KEY is not configured. AI features require a valid API key.',
      );
    }

    this._model = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: this._modelName,
    });
  }

  get instance(): GoogleGenerativeAIEmbeddings {
    return this._model;
  }

  get modelName(): string {
    return this._modelName;
  }

  get providerName(): string {
    return this._providerName;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      return await this._model.embedDocuments(texts);
    } catch (error) {
      throw new EmbeddingModelException(
        'Failed to generate embeddings for documents',
        error,
      );
    }
  }

  async embedQuery(query: string): Promise<number[]> {
    try {
      return await this._model.embedQuery(query);
    } catch (error) {
      throw new EmbeddingModelException(
        'Failed to generate embedding for query',
        error,
      );
    }
  }
}
