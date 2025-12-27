import { Module } from '@nestjs/common';
import { ClassroomPostService } from './classroom-post.service';
import { ClassroomPostController } from './classroom-post.controller';

@Module({
  controllers: [ClassroomPostController],
  providers: [ClassroomPostService],
})
export class ClassroomPostModule {}
