import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { type CourseStatus } from 'src/database/schema';

export class CreateCourseDto {
  @ApiPropertyOptional({ example: 'user-id-from-auth' })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiProperty({ example: 'CS101' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Course code must be at least 2 characters long' })
  code: string;

  @ApiProperty({ example: 'Introduction to Computer Science' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Learn the basics of computer science' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Credit must be at least 1' })
  credits?: number;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'archived'])
  status?: CourseStatus;

  @ApiPropertyOptional({ example: 'uuid-of-semester' })
  @IsOptional()
  @IsUUID()
  semesterId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-session' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @IsNumber()
  maxStudents?: number;
}
