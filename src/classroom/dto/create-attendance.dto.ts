import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ATTENDANCE_STATUS } from 'src/database/schema';

export class CreateAttendanceDto {
  @ApiProperty({
    description: 'The ID of the student',
  })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    enum: ATTENDANCE_STATUS,
    default: ATTENDANCE_STATUS.PRESENT,
    description: 'Attendance status of the student',
  })
  @IsEnum(ATTENDANCE_STATUS)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: '2025-10-24',
    description: 'The date of attendance (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    example: 'Late due to bus delay',
    description: 'Optional notes about the attendance',
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class AttendanceRecordDto {
  @ApiProperty({ description: 'The ID of the student' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    enum: ATTENDANCE_STATUS,
    default: ATTENDANCE_STATUS.PRESENT,
    description: 'Attendance status',
  })
  @IsEnum(ATTENDANCE_STATUS)
  status: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkCreateAttendanceDto {
  @ApiProperty({
    example: '2025-10-24',
    description: 'The date for the entire batch (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
