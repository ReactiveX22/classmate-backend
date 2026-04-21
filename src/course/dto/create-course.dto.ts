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
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Course code must be at least 2 characters long' })
  code: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Credit must be at least 1' })
  credits?: number;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'archived'])
  status?: CourseStatus;

  @IsNotEmpty()
  @IsUUID()
  semesterId: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsNumber()
  maxStudents?: number;
}
