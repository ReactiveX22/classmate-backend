import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttachmentDto } from './create-classroom-post.dto';

export class CreateSubmissionDto {
  @ApiPropertyOptional({
    description: 'The text response for the assignment if applicable',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    type: [AttachmentDto],
    default: [],
    description: 'Uploaded files or shared links',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class GradeSubmissionDto {
  @ApiProperty({ minimum: 0, description: 'Score given to the student' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  grade: number;

  @ApiPropertyOptional({ description: 'Teacher feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
