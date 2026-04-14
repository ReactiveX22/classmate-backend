import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateClassroomPostCommentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;
}
