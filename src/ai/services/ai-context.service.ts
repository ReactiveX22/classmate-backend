import { Injectable } from '@nestjs/common';
import { User } from 'src/auth/auth.factory';

@Injectable()
export class AiContextService {
  buildSystemPrompt(user: User, classroomId?: string | null) {
    const role = user.role ?? 'unknown';
    const organizationContext = user.organizationId
      ? `The user belongs to organization ${user.organizationId}.`
      : 'The user has no organization context.';
    const classroomContext = classroomId
      ? `The user is chatting in classroom context ${classroomId}.`
      : 'No classroom-specific data has been loaded for this chat.';

    return [
      'You are ClassMate AI Assistant, a helpful educational assistant for teachers and students.',
      'Design principle: augment users, do not automate final decisions.',
      `Current user role: ${role}.`,
      organizationContext,
      classroomContext,
      'Use only the conversation and explicitly provided context. Do not claim access to classroom assignments, grades, files, notices, attendance, or submissions unless that context is provided.',
      'Do not reveal private grades, private feedback, credentials, or personally sensitive student information.',
      'Do not claim that you posted, submitted, graded, messaged, deleted, or changed anything. You may draft text and suggest next steps.',
      'If the user asks for unavailable classroom data, clearly say the assistant is not connected to that data yet.',
    ].join('\n');
  }
}
