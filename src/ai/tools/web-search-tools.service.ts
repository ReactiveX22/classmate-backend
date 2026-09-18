import { TavilySearch } from '@langchain/tavily';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class WebSearchToolsService {
  private readonly logger = new Logger(WebSearchToolsService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {
    const apiKey = this.configService.get<string>('TAVILY_API_KEY');
    this.enabled = !!apiKey;

    if (this.enabled) {
      this.logger.log('Web search tool enabled');
    } else {
      this.logger.warn(
        'TAVILY_API_KEY not set — web search tool disabled',
      );
    }
  }

  getTools() {
    if (!this.enabled) {
      return [];
    }

    return [
      new TavilySearch({
        maxResults: 5,
        searchDepth: 'basic',
        includeAnswer: true,
        topic: 'general',
      }),
    ];
  }
}
