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
    findLastUserMessage: ReturnType<typeof vi.fn>;
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
      findLastUserMessage: vi.fn().mockResolvedValue(userMessage),
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
      service.streamChat(
        { message: 'Hello', conversationId: 'conversation-1' },
        user as never,
      ),
    );

    expect(events.map((event) => event.data.type)).toEqual([
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
      service.streamChat(
        { message: 'Hello', conversationId: 'conversation-1' },
        user as never,
      ),
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

  it('emits an error event when the LLM stream fails', async () => {
    llmService.streamChat.mockImplementation(() => {
      const gen = (function* (): Generator<LlmStreamEvent> {
        yield { type: 'error', payload: { message: 'test' } };
      })();
      gen.throw(new Error('Failed to parse stream'));
      return gen;
    });

    const events: MessageEvent[] = [];

    await new Promise((resolve) => {
      service
        .streamChat(
          { message: 'Hello', conversationId: 'conversation-1' },
          user as never,
        )
        .subscribe({
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

  it('generates and attaches a title when the conversation has none', async () => {
    repository.findConversationForUser.mockResolvedValue({
      ...conversation,
      title: null,
    });
    llmService.generateTitle.mockResolvedValue('Hello Title');
    repository.updateConversationTitle.mockResolvedValue({
      ...conversation,
      title: 'Hello Title',
    });
    llmService.streamChat.mockImplementation(
      streamEvents([
        { type: 'content', payload: { delta: 'Hello' } },
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
      service.streamChat(
        {
          message: 'How do I reset my password?',
          conversationId: 'conversation-1',
        },
        user as never,
      ),
    );

    expect(llmService.generateTitle).toHaveBeenCalledWith(
      'How do I reset my password?',
    );
    expect(repository.updateConversationTitle).toHaveBeenCalledWith(
      'conversation-1',
      'Hello Title',
    );
    const finalEvent = events.find((event) => event.data.type === 'final');
    expect(finalEvent?.data).toMatchObject({
      type: 'final',
      payload: {
        conversation: expect.objectContaining({ title: 'Hello Title' }),
      },
    });
  });

  it('falls back to a truncated message when title generation fails', async () => {
    repository.findConversationForUser.mockResolvedValue({
      ...conversation,
      title: null,
    });
    llmService.generateTitle.mockResolvedValue(undefined);
    repository.updateConversationTitle.mockResolvedValue({
      ...conversation,
      title: 'How do I reset my password?',
    });
    llmService.streamChat.mockImplementation(
      streamEvents([{ type: 'content', payload: { delta: 'Hello' } }]),
    );

    await collectEvents(
      service.streamChat(
        {
          message: 'How do I reset my password?',
          conversationId: 'conversation-1',
        },
        user as never,
      ),
    );

    expect(repository.updateConversationTitle).toHaveBeenCalledWith(
      'conversation-1',
      'How do I reset my password?',
    );
  });

  it('does not regenerate a title when one already exists', async () => {
    llmService.streamChat.mockImplementation(
      streamEvents([{ type: 'content', payload: { delta: 'Hello' } }]),
    );

    await collectEvents(
      service.streamChat(
        { message: 'Hello', conversationId: 'conversation-1' },
        user as never,
      ),
    );

    expect(llmService.generateTitle).not.toHaveBeenCalled();
    expect(repository.updateConversationTitle).not.toHaveBeenCalled();
  });
});

describe('AiService.retryStreamChat', () => {
  let repository: {
    createMessage: ReturnType<typeof vi.fn>;
    updateConversationTitle: ReturnType<typeof vi.fn>;
    findConversationForUser: ReturnType<typeof vi.fn>;
    findLastUserMessage: ReturnType<typeof vi.fn>;
  };
  let llmService: {
    streamChat: ReturnType<typeof vi.fn>;
    generateTitle: ReturnType<typeof vi.fn>;
  };
  let service: AiService;

  beforeEach(() => {
    repository = {
      createMessage: vi.fn().mockResolvedValue(assistantMessage),
      updateConversationTitle: vi.fn().mockResolvedValue({
        ...conversation,
        title: 'Retried Title',
      }),
      findConversationForUser: vi.fn().mockResolvedValue({
        ...conversation,
        title: null,
      }),
      findLastUserMessage: vi.fn().mockResolvedValue(userMessage),
    };
    llmService = {
      streamChat: vi.fn(),
      generateTitle: vi.fn().mockResolvedValue('Retried Title'),
    };
    service = new AiService(
      repository as unknown as AiConversationRepository,
      llmService as unknown as LlmService,
      {} as never,
      {} as never,
    );
  });

  it('backfills a missing title and attaches it to the final event', async () => {
    llmService.streamChat.mockImplementation(
      streamEvents([
        { type: 'content', payload: { delta: 'Hello' } },
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
      service.retryStreamChat(
        { conversationId: 'conversation-1' },
        user as never,
      ),
    );

    expect(llmService.generateTitle).toHaveBeenCalledWith('Hello');
    expect(repository.updateConversationTitle).toHaveBeenCalledWith(
      'conversation-1',
      'Retried Title',
    );
    const finalEvent = events.find((event) => event.data.type === 'final');
    expect(finalEvent?.data).toMatchObject({
      type: 'final',
      payload: {
        conversation: expect.objectContaining({ title: 'Retried Title' }),
      },
    });
  });

  it('does not regenerate a title when one already exists', async () => {
    repository.findConversationForUser.mockResolvedValue(conversation);
    llmService.streamChat.mockImplementation(
      streamEvents([{ type: 'content', payload: { delta: 'Hello' } }]),
    );

    await collectEvents(
      service.retryStreamChat(
        { conversationId: 'conversation-1' },
        user as never,
      ),
    );

    expect(llmService.generateTitle).not.toHaveBeenCalled();
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
