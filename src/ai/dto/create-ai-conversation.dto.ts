import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAiConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsUUID()
  classroomId?: string;
}
