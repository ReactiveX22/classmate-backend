import { Injectable } from '@nestjs/common';
import { CreateClassroomDto } from './dto/create-classroom.dto';

@Injectable()
export class ClassroomService {
  async create(dto: CreateClassroomDto, userId: string) {
    // check userId and dto.teacherId are same person (we could use a decorator for it? to get the teacherId from session user?)
    // check if course exists? or may be not check it just handle that error using our drizzle exception filter?
    // generate the classCode (invite code)

    // finally pass it to repository

    return dto;
  }
}
