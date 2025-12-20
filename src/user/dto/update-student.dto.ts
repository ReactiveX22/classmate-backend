import { PartialType } from '@nestjs/mapped-types';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { CreateStudentDto } from './create-student.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
