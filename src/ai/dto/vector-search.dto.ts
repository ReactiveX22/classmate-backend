import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class VectorSearchDto {
  @IsString()
  query: string;

  @Min(1)
  @Max(20)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
