import { PartialType } from '@nestjs/mapped-types';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { CreateTeacherDto } from './create-teacher.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
