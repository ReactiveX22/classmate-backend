import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
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
