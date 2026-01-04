import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
