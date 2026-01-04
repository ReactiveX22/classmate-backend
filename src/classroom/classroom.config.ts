import { Injectable } from '@nestjs/common';
import { DB } from 'better-auth/adapters/drizzle';
import {
  and,
  count,
  countDistinct,
  eq,
  getTableColumns,
  sql,
  SQL,
} from 'drizzle-orm';
import {
  assignmentSubmission,
  classroom,
  classroomMembers,
  classroomPost,
  course,
  user,
} from 'src/database/schema';
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
    const studentCountSq = db
      .select({
        classroomId: classroomMembers.classroomId,
        count: count(classroomMembers.studentId).as('student_count'),
      })
      .from(classroomMembers)
      .groupBy(classroomMembers.classroomId)
      .as('sq');

    return db
      .select({
        classroom: classroom,
        course: course,
        studentCount: sql<number>`COALESCE(${studentCountSq.count}, 0)`.mapWith(
          Number,
        ),
      })
      .from(classroom)
      .innerJoin(course, eq(classroom.courseId, course.id))
      .leftJoin(studentCountSq, eq(classroom.id, studentCountSq.classroomId))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [result] = await db
      .select({ total: countDistinct(classroom.id) })
      .from(classroom)
      .innerJoin(course, eq(classroom.courseId, course.id))
      .leftJoin(
        classroomMembers,
        eq(classroom.id, classroomMembers.classroomId),
      )
      .where(and(...filters));

    return result?.total ?? 0;
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
  defaultSortOrder: 'asc' | 'desc' = 'desc';

  constructor(private readonly studentId?: string) {
    super();
  }

  getBaseQuery(db: DB) {
    const query = db
      .select({
        ...getTableColumns(classroomPost),
        author: user,
        submission: assignmentSubmission,
      })
      .from(classroomPost)
      .innerJoin(user, eq(classroomPost.authorId, user.id));

    if (this.studentId) {
      query.leftJoin(
        assignmentSubmission,
        and(
          eq(assignmentSubmission.postId, classroomPost.id),
          eq(assignmentSubmission.studentId, this.studentId),
        ),
      );
    }

    return query.$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(classroomPost)
      .innerJoin(user, eq(classroomPost.authorId, user.id))
      .where(and(...filters));
    return total;
  }
}
