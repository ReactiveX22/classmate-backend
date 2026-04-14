import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClassroomPostCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}
