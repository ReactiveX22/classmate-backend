import { MessageEvent } from '@nestjs/common';
import { firstValueFrom, toArray } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiService } from './ai.service';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { LlmService } from './services/llm.service';
import { LlmStreamEvent } from './types/ai-stream-event.types';

const user = {
  id: 'user-1',
  organizationId: 'org-1',
};

const conversation = {
  id: 'conversation-1',
  organizationId: 'org-1',
  userId: 'user-1',
  classroomId: 'classroom-1',
  title: 'Existing title',
  status: 'active' as const,
  metadata: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const userMessage = {
  id: 'message-user-1',
  conversationId: conversation.id,
  organizationId: 'org-1',
  userId: 'user-1',
  role: 'user' as const,
  content: 'Hello',
  provider: null,
  model: null,
  tokenUsage: null,
  metadata: {},
  createdAt: new Date('2026-01-01T00:00:01.000Z'),
};

const assistantMessage = {
  id: 'message-assistant-1',
  conversationId: conversation.id,
  organizationId: 'org-1',
  userId: null,
  role: 'assistant' as const,
  content: 'Hello there',
  provider: 'google',
  model: 'gemini-2.5-flash',
  tokenUsage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
  metadata: {
    toolCalls: [{ name: 'search_classroom_documents', status: 'end' }],
  },
  createdAt: new Date('2026-01-01T00:00:02.000Z'),
};

function streamEvents(events: LlmStreamEvent[]) {
  return async function* generator() {
    for (const event of events) {
      yield await Promise.resolve(event);
    }
  };
}

describe('AiService.streamChat', () => {
  let repository: {
    userCanAccessClassroom: ReturnType<typeof vi.fn>;
    createConversation: ReturnType<typeof vi.fn>;
    createMessage: ReturnType<typeof vi.fn>;
    touchConversation: ReturnType<typeof vi.fn>;
    updateConversationTitle: ReturnType<typeof vi.fn>;
    findConversationForUser: ReturnType<typeof vi.fn>;
  };
  let llmService: {
    streamChat: ReturnType<typeof vi.fn>;
    generateTitle: ReturnType<typeof vi.fn>;
  };
  let service: AiService;

  beforeEach(() => {
    repository = {
      userCanAccessClassroom: vi.fn().mockResolvedValue(true),
      createConversation: vi.fn().mockResolvedValue(conversation),
      createMessage: vi
        .fn()
        .mockResolvedValueOnce(userMessage)
        .mockResolvedValueOnce(assistantMessage),
      touchConversation: vi.fn().mockResolvedValue(undefined),
      updateConversationTitle: vi.fn().mockResolvedValue(conversation),
      findConversationForUser: vi.fn().mockResolvedValue(conversation),
    };
    llmService = {
      streamChat: vi.fn(),
      generateTitle: vi.fn().mockResolvedValue(undefined),
    };
    service = new AiService(
      repository as unknown as AiConversationRepository,
      llmService as unknown as LlmService,
      {} as never,
      {} as never,
    );
  });

  it('emits conversation, user message, content, tool, and final events in order', async () => {
    llmService.streamChat.mockImplementation(
      streamEvents([
        { type: 'content', payload: { delta: 'Hello' } },
        {
          type: 'tool',
          payload: { name: 'search_classroom_documents', status: 'start' },
        },
        {
          type: 'tool',
          payload: { name: 'search_classroom_documents', status: 'end' },
        },
        {
          type: '_internal_final_llm',
          payload: {
            content: 'Hello there',
            provider: 'google',
            model: 'gemini-2.5-flash',
            tokenUsage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
          },
        },
      ]),
    );

    const events = await collectEvents(
      service.streamChat({ message: 'Hello', conversationId: 'conversation-1' }, user as never),
    );

    expect(events.map((event) => event.data.type)).toEqual([
      'conversation',
      'user_message',
      'content',
      'tool',
      'tool',
      'final',
    ]);
    expect(repository.createMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: 'Hello there',
        provider: 'google',
        model: 'gemini-2.5-flash',
        tokenUsage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
        metadata: {
          toolCalls: [{ name: 'search_classroom_documents', status: 'end' }],
        },
      }),
    );
  });

  it('persists joined content deltas when final LLM content is unavailable', async () => {
    llmService.streamChat.mockImplementation(
      streamEvents([
        { type: 'content', payload: { delta: 'Hello' } },
        { type: 'content', payload: { delta: ' there' } },
      ]),
    );

    await collectEvents(
      service.streamChat({ message: 'Hello', conversationId: 'conversation-1' }, user as never),
    );

    expect(repository.createMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: 'Hello there',
        provider: undefined,
        model: undefined,
        tokenUsage: undefined,
      }),
    );
  });

  it('emits an error event when the conversation is missing', async () => {
    repository.findConversationForUser.mockResolvedValue(null);

    const events: MessageEvent[] = [];

    await new Promise((resolve) => {
      service
        .streamChat(
          {
            message: 'Hello',
            conversationId: 'conversation-1',
          },
          user as never,
        )
        .subscribe({
          next: (event) => events.push(event),
          complete: () => resolve(undefined),
        });
    });

    expect(events).toEqual([
      {
        data: {
          type: 'error',
          payload: { message: 'AI conversation not found' },
        },
      },
    ]);
  });

  it('creates new conversations with an immediate provisional title', async () => {
    llmService.streamChat.mockImplementation(
      streamEvents([
        {
          type: '_internal_final_llm',
          payload: {
            content: 'Hello there',
            provider: 'google',
            model: 'gemini-2.5-flash',
          },
        },
      ]),
    );

    await collectEvents(
      service.streamChat(
        {
          message: 'What are the exam rules for next week?',
          conversationId: 'conversation-1',
        },
        user as never,
      ),
    );

    expect(repository.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'What are the exam rules for next week?',
      }),
    );
    expect(llmService.generateTitle).toHaveBeenCalledWith(
      'What are the exam rules for next week?',
    );
  });

  it('emits an error event when the LLM stream fails', async () => {
    llmService.streamChat.mockImplementation(async function* () {
      throw new Error('Failed to parse stream');
    });

    const events: MessageEvent[] = [];

    await new Promise((resolve) => {
      service.streamChat({ message: 'Hello', conversationId: 'conversation-1' }, user as never).subscribe({
        next: (event) => events.push(event),
        complete: () => resolve(undefined),
      });
    });

    expect(events.at(-1)).toEqual({
      data: {
        type: 'error',
        payload: { message: 'The AI provider returned an invalid response.' },
      },
    });
  });
});

async function collectEvents(observable: ReturnType<AiService['streamChat']>) {
  const events: MessageEvent[] = [];

  await firstValueFrom(observable.pipe(toArray())).then(
    (value) => {
      events.push(...value);
    },
    (error) => {
      throw error;
    },
  );

  return events as Array<MessageEvent & { data: { type: string } }>;
}
