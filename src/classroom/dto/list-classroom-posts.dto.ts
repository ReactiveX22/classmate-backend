import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

export class ListClassroomPostsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['announcement', 'assignment', 'material', 'question'])
  type?: 'announcement' | 'assignment' | 'material' | 'question';

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(
    ({ value }: TransformFnParams) => value === 'true' || value === true,
  )
  @IsBoolean()
  bookmarked?: boolean;

  @IsOptional()
  @Transform(
    ({ value }: TransformFnParams) => value === 'true' || value === true,
  )
  @IsBoolean()
  fromInstructor?: boolean;
}
