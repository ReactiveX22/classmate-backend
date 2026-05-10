import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingService } from './chunking.service';
import type { Document } from '@langchain/core/documents';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkDocuments', () => {
    it('should split a long document into multiple chunks', async () => {
      const longText = 'a'.repeat(2000); // 2000 characters
      const docs: Document[] = [
        {
          pageContent: longText,
          metadata: { source: 'test' },
        },
      ];

      // chunkSize = 1200, overlap = 200 (from defaults)
      // First chunk: 0 - 1200
      // Second chunk: 1000 - 2000 (approx)
      const chunks = await service.chunkDocuments(docs);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].text.length).toBeLessThanOrEqual(1200);
      expect(chunks[0].metadata.chunkIndex).toBe(0);
      expect(chunks[0].metadata.source).toBe('test');
    });

    it('should respect maxChunks limit and truncate', async () => {
      const veryLongText = 'a '.repeat(5000); // Many small words to force many chunks
      const docs: Document[] = [
        {
          pageContent: veryLongText,
          metadata: { source: 'test' },
        },
      ];

      const maxChunks = 2;
      const chunks = await service.chunkDocuments(docs, {
        chunkSize: 10,
        chunkOverlap: 0,
        maxChunks,
      });

      expect(chunks.length).toBe(maxChunks);
      expect(chunks[1].metadata.chunkIndex).toBe(1);
    });

    it('should include chunkCount in metadata', async () => {
      const text = 'hello world. this is a test. '.repeat(10);
      const docs: Document[] = [
        {
          pageContent: text,
          metadata: { source: 'test' },
        },
      ];

      const chunks = await service.chunkDocuments(docs, {
        chunkSize: 50,
        chunkOverlap: 0,
      });

      expect(chunks[0].metadata.chunkCount).toBe(chunks.length);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens as 1/4 of character length', () => {
      expect(service.estimateTokens('1234')).toBe(1);
      expect(service.estimateTokens('12345')).toBe(2);
    });
  });
});
