export type AiMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type AiChatMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiTokenUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};
