import { IsOptional, IsUUID } from 'class-validator';

export class CreateAiChatDto {
  @IsOptional()
  @IsUUID()
  classroomId?: string;
}
