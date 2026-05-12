import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ClassroomRepository } from '../../classroom/classroom.repository';
import { EmbeddingVectorStoreService } from '../../embedding/services/embedding-vector-store.service';

interface ToolConfigurable {
  classroomId?: string;
  user?: {
    id: string;
    role?: string;
  };
}

@Injectable()
export class RagToolsService {
  constructor(
    private readonly vectorStoreService: EmbeddingVectorStoreService,
    private readonly classroomRepository: ClassroomRepository,
  ) {}

  getTools() {
    return [this.buildSearchDocumentsTool()];
  }

  private buildSearchDocumentsTool() {
    const vectorStoreService = this.vectorStoreService;
    const classroomRepository = this.classroomRepository;

    return tool(
      async (
        { query, limit, classroomId: argClassroomId },
        config: ToolRunnableConfig,
      ) => {
        const { user, classroomId: configClassroomId } = (config.configurable ??
          {}) as ToolConfigurable;
        const classroomId = argClassroomId || configClassroomId;

        if (!classroomId) {
          return 'No classroom context available. Please provide a classroomId or call list_user_classrooms first.';
        }

        if (argClassroomId && user?.id) {
          const joined = await classroomRepository.findJoinedClassrooms(
            user.id,
          );
          if (!joined.some((c) => c.id === argClassroomId)) {
            return 'Access denied to the specified classroom.';
          }
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
            source:
              meta['attachmentName'] ??
              meta['fileName'] ??
              meta['source'] ??
              'Unknown',
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
          classroomId: z
            .string()
            .uuid()
            .optional()
            .describe('The ID of the classroom to search documents in.'),
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
