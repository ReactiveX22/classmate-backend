import { SystemMessage } from '@langchain/core/messages';
import { Injectable, Logger } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';
import { AppRole } from 'src/common/enums/role.enum';
import { PromptLoaderService } from './prompt-loader.service';

@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);

  constructor(private readonly promptLoader: PromptLoaderService) {}

  buildSystemPrompt(user: User): SystemMessage {
    const role = user.role ?? 'student';
    const modeFile =
      role === AppRole.Instructor ? 'teacher-mode' : 'tutor-mode';

    const assembled = this.promptLoader.assemble([
      'core',
      modeFile,
      'output-format',
      'self-check',
    ]);

    const userContext = this.buildUserContext(user);
    const fullPrompt = `${assembled}\n\n---\n\n## Current User Context\n- Role: ${userContext.role}\n- Classrooms: You can list them using your tools if needed.`;

    this.logger.debug(
      `Built system prompt: ~${this.promptLoader.getTokenEstimate(fullPrompt)} tokens (role: ${role})`,
    );

    return new SystemMessage(fullPrompt);
  }

  private buildUserContext(user: User) {
    return {
      role: user.role ?? 'Unknown',
    };
  }
}
