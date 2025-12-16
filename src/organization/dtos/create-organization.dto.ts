import { IsNotEmpty, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;
}
