import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAiConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;
}
