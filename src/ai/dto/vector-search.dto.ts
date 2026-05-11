import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class VectorSearchDto {
  @IsString()
  @IsUUID()
  classroomId: string;

  @IsString()
  query: string;

  @Min(1)
  @Max(20)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
