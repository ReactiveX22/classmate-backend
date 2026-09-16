import { IsNotEmpty, IsUUID } from 'class-validator';

export class ConfirmImportDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Preview id is required' })
  previewId: string;
}
