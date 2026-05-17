import { Injectable } from '@nestjs/common';
import { ClassroomToolsService } from './classroom-tools.service';
import { NoticeToolsService } from './notice-tools.service';
import { RagToolsService } from './rag-tools.service';

@Injectable()
export class AiToolsRegistry {
  constructor(
    private readonly ragTools: RagToolsService,
    private readonly classroomTools: ClassroomToolsService,
    private readonly noticeTools: NoticeToolsService,
  ) {}

  getTools() {
    return [
      ...this.ragTools.getTools(),
      ...this.classroomTools.getTools(),
      ...this.noticeTools.getTools(),
    ];
  }
}
