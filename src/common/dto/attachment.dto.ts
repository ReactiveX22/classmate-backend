import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum AttachmentType {
  FILE = 'file',
  LINK = 'link',
  VIDEO = 'video',
  IMAGE = 'image',
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

  @ApiProperty({ description: 'Relative path to the attachment' })
  @IsString()
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
