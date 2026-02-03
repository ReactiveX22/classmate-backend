import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsOptional()
  @IsString()
  teacherId: string;

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

  @IsNotEmpty()
  @IsString()
  @MinLength(4, { message: 'Semester must be at least 4 characters long' })
  semester: string;

  @IsOptional()
  @IsNumber()
  maxStudents: number;
}
