import type { UsageMetadata } from '@langchain/core/messages';
import type {
  SelectAiConversation,
  SelectAiMessage,
} from 'src/database/schema';

export type ConversationPayload = {
  id: string;
  title: string | null;
  classroomId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export type MessagePayload = {
  id: string;
  role: SelectAiMessage['role'];
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type AiStreamEvent =
  | { type: 'conversation'; payload: ConversationPayload }
  | { type: 'user_message'; payload: MessagePayload }
  | { type: 'content'; payload: { delta: string } }
  | { type: 'reasoning'; payload: { delta: string } }
  | { type: 'tool'; payload: { name: string; status: 'start' | 'end' } }
  | {
      type: 'final';
      payload: MessagePayload & { conversation?: ConversationPayload };
    }
  | { type: 'error'; payload: { message: string } };

export type AiInternalFinalLlmEvent = {
  type: '_internal_final_llm';
  payload: {
    content: string;
    tokenUsage?: UsageMetadata;
    provider: string;
    model: string;
    reasoning?: string;
  };
};

export type LlmStreamEvent = AiStreamEvent | AiInternalFinalLlmEvent;

export type ConversationResponseSource = Pick<
  SelectAiConversation,
  'id' | 'title' | 'classroomId' | 'updatedAt' | 'createdAt'
>;
