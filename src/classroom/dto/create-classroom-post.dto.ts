import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum PostType {
  ANNOUNCEMENT = 'announcement',
  ASSIGNMENT = 'assignment',
  MATERIAL = 'material',
  QUESTION = 'question',
}

export enum AttachmentType {
  FILE = 'file',
  LINK = 'link',
  VIDEO = 'video',
  IMAGE = 'image',
}

export enum SubmissionType {
  FILE = 'file',
  TEXT = 'text',
  LINK = 'link',
  MULTIPLE = 'multiple',
}

export enum SubmissionStatus {
  ASSIGNED = 'assigned',
  TURNED_IN = 'turned_in',
  GRADED = 'graded',
  RETURNED = 'returned',
}

export class AttachmentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUrl({
    require_tld: false, // This allows 'localhost' which has no TLD
    require_protocol: true, // Ensures http:// or https:// is present
  })
  @IsNotEmpty()
  url: string;

  @ApiProperty({ enum: AttachmentType })
  @IsEnum(AttachmentType)
  type: AttachmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class AssignmentDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowLateSubmission?: boolean;

  @ApiPropertyOptional({ enum: SubmissionType })
  @IsOptional()
  @IsEnum(SubmissionType)
  submissionType?: SubmissionType;
}

export class CreateClassroomPostDto {
  @ApiProperty({ enum: PostType, default: PostType.ANNOUNCEMENT })
  @IsEnum(PostType)
  @IsNotEmpty()
  type: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ type: [AttachmentDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ type: AssignmentDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentDataDto)
  assignmentData?: AssignmentDataDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;
}
