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
  classroomPostComment,
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
        teacher: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        studentCount: sql<number>`COALESCE(${studentCountSq.count}, 0)`.mapWith(
          Number,
        ),
      })
      .from(classroom)
      .innerJoin(course, eq(classroom.courseId, course.id))
      .innerJoin(user, eq(classroom.teacherId, user.id))
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

  constructor(
    private readonly userId?: string,
    private readonly isInstructor: boolean = false,
  ) {
    super();
  }

  getBaseQuery(db: DB) {
    // 1. Prepare the submission count subquery
    const subCounts = db
      .select({
        postId: assignmentSubmission.postId,
        total: count(assignmentSubmission.id).as('total'),
        graded: count(
          sql`CASE WHEN ${assignmentSubmission.grade} IS NOT NULL THEN 1 END`,
        ).as('graded'),
      })
      .from(assignmentSubmission)
      .groupBy(assignmentSubmission.postId)
      .as('sub_counts');

    const selectFields: any = {
      ...getTableColumns(classroomPost),
      author: user,
    };

    if (this.isInstructor) {
      selectFields.submissionStats = sql`
      CASE
        WHEN ${classroomPost.type} = 'assignment'
        THEN json_build_object(
          'total', CAST(COALESCE(${subCounts.total}, 0) AS INTEGER),
          'graded', CAST(COALESCE(${subCounts.graded}, 0) AS INTEGER)
        )
        ELSE NULL
      END`.as('submissionStats');
    } else {
      selectFields.submission = assignmentSubmission;
    }

    // Add comment data using correlated subqueries (count + recent 3 comments)
    const commentCountSq = sql<number>`(
      SELECT COUNT(*)
      FROM ${classroomPostComment}
      WHERE ${classroomPostComment.postId} = ${classroomPost.id}
    )`.as('commentCount');

    const recentCommentsSq = sql`COALESCE(
      (
        SELECT json_agg(comment_data)
        FROM (
          SELECT 
            c.id,
            c.content,
            c."created_at",
            json_build_object(
              'id', u.id,
              'name', u.name,
              'image', u.image
            ) as author
          FROM ${classroomPostComment} c
          INNER JOIN ${user} u ON c."author_id" = u.id
          WHERE c."post_id" = ${classroomPost.id}
          ORDER BY c."created_at" DESC
          LIMIT 3
        ) comment_data
      ),
      '[]'::json
    )`.as('recentComments');

    selectFields.commentCount = commentCountSq;
    selectFields.recentComments = recentCommentsSq;

    const query = db
      .select(selectFields)
      .from(classroomPost)
      .innerJoin(user, eq(classroomPost.authorId, user.id));

    if (this.isInstructor) {
      query.leftJoin(subCounts, eq(classroomPost.id, subCounts.postId));
    } else if (this.userId) {
      query.leftJoin(
        assignmentSubmission,
        and(
          eq(assignmentSubmission.postId, classroomPost.id),
          eq(assignmentSubmission.studentId, this.userId),
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

@Injectable()
export class SubmissionPaginationConfig extends PaginationConfig<
  typeof assignmentSubmission
> {
  table = assignmentSubmission;
  searchableFields = [];
  sortFields = {
    content: assignmentSubmission.content,
    createdAt: assignmentSubmission.createdAt,
    updatedAt: assignmentSubmission.updatedAt,
    status: assignmentSubmission.status,
  };
  defaultSortField = 'createdAt';
  defaultSortOrder: 'asc' | 'desc' = 'desc';

  getBaseQuery(db: DB) {
    return db
      .select({
        ...getTableColumns(assignmentSubmission),
        student: user,
      })
      .from(assignmentSubmission)
      .innerJoin(user, eq(assignmentSubmission.studentId, user.id))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(assignmentSubmission)
      .innerJoin(user, eq(assignmentSubmission.studentId, user.id))
      .where(and(...filters));
    return total;
  }
}
