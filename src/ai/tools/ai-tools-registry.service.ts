import { Injectable } from '@nestjs/common';
import { ClassroomToolsService } from './classroom-tools.service';
import { RagToolsService } from './rag-tools.service';

@Injectable()
export class AiToolsRegistry {
  constructor(
    private readonly ragTools: RagToolsService,
    private readonly classroomTools: ClassroomToolsService,
  ) {}

  getTools() {
    return [...this.ragTools.getTools(), ...this.classroomTools.getTools()];
  }
}
