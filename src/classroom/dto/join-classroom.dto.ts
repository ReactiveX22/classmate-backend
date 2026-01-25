import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class JoinClassroomDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  classCode: string;
}
