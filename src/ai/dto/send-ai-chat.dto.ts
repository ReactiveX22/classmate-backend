import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendAiChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message: string;

  @IsUUID()
  classroomId: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
