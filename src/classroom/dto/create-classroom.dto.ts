import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateClassroomDto {
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3, {
    message: 'Classroom name must be at least 3 characters long',
  })
  name: string;

  @IsOptional()
  @IsString()
  section: string;

  @IsOptional()
  @IsString()
  description: string;
}
