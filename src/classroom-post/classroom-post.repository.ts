import { Injectable } from '@nestjs/common';
import { type DB, InjectDb } from 'src/database/db.provider';
import { CreateClassroomPostDto } from './dto/create-classroom-post.dto';
import { classroomPost } from 'src/database/schema';

@Injectable()
export class ClassroomPostRepository {
  constructor(@InjectDb() private readonly db: DB) {}

  async create(data: typeof classroomPost.$inferInsert, authorId: string) {
    const post = await this.db
      .insert(classroomPost)
      .values({ ...data, authorId: authorId })
      .returning();
    return post;
  }
}
