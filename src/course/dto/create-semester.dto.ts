import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSemesterDto {
  @ApiProperty({ example: '1st' })
  @IsNotEmpty()
  @IsString()
  ordinal: string;

  @ApiPropertyOptional({ example: 'Spring 2024' })
  @IsOptional()
  @IsString()
  name?: string;
}
