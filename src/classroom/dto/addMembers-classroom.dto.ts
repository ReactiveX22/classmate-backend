import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddMembersClassroomDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  studentIds: string[];
}
