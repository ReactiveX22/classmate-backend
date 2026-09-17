import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSemesterDto {
  @ApiProperty({ example: '1st' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  ordinal: string;

  @ApiPropertyOptional({ example: 'Spring 2024' })
  @IsOptional()
  @IsString()
  name?: string;
}
