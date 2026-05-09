import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendAiMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message: string;

  @IsOptional()
  @IsUUID()
  classroomId?: string;
}
