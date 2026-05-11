import { Injectable } from '@nestjs/common';
import { RagToolsService } from './rag-tools.service';

@Injectable()
export class AiToolsRegistry {
  constructor(
    private readonly ragTools: RagToolsService,
    // Add other tool services here later
  ) {}

  getTools() {
    return [
      ...this.ragTools.getTools(),
      // Add other tool sets here later
    ];
  }
}
