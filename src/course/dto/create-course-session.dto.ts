import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCourseSessionDto {
  @ApiProperty({ example: 'Fall 2024' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'The main fall session' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-09-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
