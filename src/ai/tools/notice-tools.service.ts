import { tool, type ToolRunnableConfig } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { NoticeRepository } from '../../notice/notice.repository';

interface ToolConfigurable {
  user?: {
    id: string;
    organizationId?: string | null;
  };
}

@Injectable()
export class NoticeToolsService {
  constructor(private readonly noticeRepository: NoticeRepository) {}

  getTools() {
    return [this.buildGetNoticesTool()];
  }

  private buildGetNoticesTool() {
    const noticeRepository = this.noticeRepository;

    return tool(
      async ({ limit }, config: ToolRunnableConfig) => {
        const { user } = (config.configurable ?? {}) as ToolConfigurable;

        if (!user?.organizationId) {
          return 'No organization context available. Cannot fetch notices.';
        }

        const notices = await noticeRepository.findRecentForTools(
          user.organizationId,
          limit,
        );

        if (!notices.length) {
          return 'No notices found.';
        }

        const formatted = notices.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          createdAt: n.createdAt,
          authorName: n.authorName,
        }));

        return JSON.stringify(formatted, null, 2);
      },
      {
        name: 'get_organization_notices',
        description:
          'List recent notices and announcements in the organization. ' +
          'Use when the user asks about official notices, announcements, or organizational updates.',
        schema: z.object({
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(10)
            .default(5)
            .describe('Number of notices to return (1–10, default 5)'),
        }),
      },
    );
  }
}
