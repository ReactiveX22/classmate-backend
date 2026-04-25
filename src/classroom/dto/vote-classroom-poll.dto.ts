import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class VoteClassroomPollDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  optionIds: string[];
}
