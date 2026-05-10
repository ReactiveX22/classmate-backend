import { SystemMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';

@Injectable()
export class AiContextService {
  /**
   * Builds the system prompt for a chat turn.
   *
   * Returns a SystemMessage so it can be spread directly into a BaseMessage[]
   * array without manual wrapping at the call site.
   */
  buildSystemPrompt(user: User, classroomId?: string | null): SystemMessage {
    const lines = [
      'You are ClassMate AI Assistant, a helpful educational assistant for teachers and students.',
      'Design principle: augment users, do not automate final decisions.',
      `Current user role: ${user.role ?? 'unknown'}.`,
      this.organizationLine(user.organizationId),
      this.classroomLine(classroomId),
      'Use only the conversation and explicitly provided context.',
      'Do not claim access to classroom assignments, grades, files, notices, attendance, or submissions unless that context is explicitly provided in this prompt.',
      'Do not reveal private grades, private feedback, credentials, or personally sensitive student information.',
      'Do not claim that you posted, submitted, graded, messaged, deleted, or changed anything. You may draft text and suggest next steps.',
      'If the user asks for unavailable classroom data, clearly say the assistant is not connected to that data yet.',
    ];

    return new SystemMessage(lines.join('\n'));
  }

  private organizationLine(organizationId?: string | null): string {
    return organizationId
      ? 'The user belongs to an organization on this platform.'
      : 'The user has no organization context.';
  }

  private classroomLine(classroomId?: string | null): string {
    return classroomId
      ? 'The user is chatting within a classroom context.'
      : 'No classroom-specific data has been loaded for this chat.';
  }
}
