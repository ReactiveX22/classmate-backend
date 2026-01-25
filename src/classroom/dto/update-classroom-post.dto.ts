import { PartialType } from '@nestjs/mapped-types';
import { CreateClassroomPostDto } from './create-classroom-post.dto';

export class UpdateClassroomPostDto extends PartialType(
  CreateClassroomPostDto,
) {}
