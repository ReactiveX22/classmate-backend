import { Module } from '@nestjs/common';
import { ClassroomPostService } from './classroom-post.service';
import { ClassroomPostController } from './classroom-post.controller';
import { ClassroomModule } from 'src/classroom/classroom.module';
import { ClassroomPostRepository } from './classroom-post.repository';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [ClassroomModule, DatabaseModule],
  controllers: [ClassroomPostController],
  providers: [ClassroomPostService, ClassroomPostRepository],
})
export class ClassroomPostModule {}
