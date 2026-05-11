import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EmbeddingVectorStoreService } from '../../embedding/services/embedding-vector-store.service';

interface ToolConfigurable {
  classroomId?: string;
  user?: unknown;
}

@Injectable()
export class RagToolsService {
  constructor(
    private readonly vectorStoreService: EmbeddingVectorStoreService,
  ) {}

  getTools() {
    return [this.buildSearchDocumentsTool()];
  }

  private buildSearchDocumentsTool() {
    const vectorStoreService = this.vectorStoreService;

    return tool(
      async ({ query, limit }, config: ToolRunnableConfig) => {
        const { classroomId } = (config.configurable ?? {}) as ToolConfigurable;

        if (!classroomId) {
          return 'No classroom context available. Cannot search documents.';
        }

        const results = await vectorStoreService.similaritySearchWithScore(
          query,
          limit,
          { classroomId },
        );

        if (!results.length) {
          return 'No relevant documents found.';
        }

        const formatted = results.map(([doc, score], index) => {
          const meta = doc.metadata as Record<string, string | null>;
          return {
            rank: index + 1,
            content: doc.pageContent,
            source: meta['fileName'] ?? meta['source'] ?? 'Unknown',
            postId: meta['postId'] ?? null,
            relevanceScore: Math.round(score * 1000) / 1000,
          };
        });

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'search_classroom_documents',
        description:
          'Search uploaded PDFs, slides, and attachments in the classroom. ' +
          'Use when the user asks about content in uploaded files or course materials. ' +
          'Returns relevant text excerpts with source file names.',
        schema: z.object({
          query: z.string().describe('Natural language search query'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(10)
            .default(5)
            .describe('Number of results to return (1–10, default 5)'),
        }),
      },
    );
  }
}
