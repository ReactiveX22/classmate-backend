import { Injectable } from '@nestjs/common';
import { DB } from 'better-auth/adapters/drizzle';
import { and, count, eq, SQL } from 'drizzle-orm';
import { classroom, classroomPost, course } from 'src/database/schema';
import { PaginationConfig } from '../lib/pagination/pagination.config';

@Injectable()
export class ClassroomPaginationConfig extends PaginationConfig<
  typeof classroom
> {
  table = classroom;
  searchableFields = [classroom.name, classroom.section, classroom.classCode];

  sortFields = {
    name: classroom.name,
    section: classroom.section,
    classCode: classroom.classCode,
    createdAt: classroom.createdAt,
    updatedAt: classroom.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db
      .select()
      .from(classroom)
      .innerJoin(course, eq(classroom.courseId, course.id))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(classroom)
      .innerJoin(course, eq(classroom.courseId, course.id))
      .where(and(...filters));
    return total;
  }
}

@Injectable()
export class ClassroomPostPaginationConfig extends PaginationConfig<
  typeof classroomPost
> {
  table = classroomPost;
  searchableFields = [classroomPost.title, classroomPost.content];
  sortFields = {
    title: classroomPost.title,
    content: classroomPost.content,
    createdAt: classroomPost.createdAt,
    updatedAt: classroomPost.updatedAt,
  };
  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db.select().from(classroomPost).$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(classroomPost)
      .where(and(...filters));
    return total;
  }
}
