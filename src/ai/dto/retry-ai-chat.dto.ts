import { IsUUID } from 'class-validator';

export class RetryAiChatDto {
  @IsUUID()
  conversationId: string;
}
