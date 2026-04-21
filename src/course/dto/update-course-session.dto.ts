import { PartialType } from '@nestjs/swagger';
import { CreateCourseSessionDto } from './create-course-session.dto';

export class UpdateCourseSessionDto extends PartialType(CreateCourseSessionDto) {}
