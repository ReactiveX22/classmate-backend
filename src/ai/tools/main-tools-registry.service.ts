import { Injectable } from '@nestjs/common';
import { ClassroomToolsService } from './classroom-tools.service';
import { DeadlineToolsService } from './deadline-tools.service';
import { NoticeToolsService } from './notice-tools.service';
import { RagToolsService } from './rag-tools.service';
import { TodoAgentToolService } from './todo-agent-tool.service';

@Injectable()
export class MainToolsRegistry {
  constructor(
    private readonly ragTools: RagToolsService,
    private readonly classroomTools: ClassroomToolsService,
    private readonly deadlineTools: DeadlineToolsService,
    private readonly noticeTools: NoticeToolsService,
    private readonly todoAgentToolService: TodoAgentToolService,
  ) {}

  getTools() {
    return [
      ...this.ragTools.getTools(),
      ...this.classroomTools.getTools(),
      ...this.deadlineTools.getTools(),
      ...this.noticeTools.getTools(),
      ...this.todoAgentToolService.getTools(),
    ];
  }
}
