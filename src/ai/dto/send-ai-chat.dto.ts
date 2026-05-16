import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendAiChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message: string;

  @IsUUID()
  conversationId: string;
}
