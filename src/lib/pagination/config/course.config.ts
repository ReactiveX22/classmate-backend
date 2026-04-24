import { and, count, SQL } from 'drizzle-orm';
import { DB } from 'src/database/db.provider';
import { course } from 'src/database/schema';
import { PaginatedConfig } from '../pagination.interface';
import { courseSession, semester } from 'src/database/schema';
import { eq } from 'drizzle-orm';

export class CoursePaginationConfig implements PaginatedConfig {
  searchableFields = [course.code, course.title];

  sortFields = {
    code: course.code,
    title: course.title,
    semester: semester.ordinal,
    session: courseSession.name,
    credits: course.credits,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };

  defaultSortField = 'createdAt';

  getBaseQuery(db: DB) {
    return db
      .select({
        id: course.id,
        organizationId: course.organizationId,
        teacherId: course.teacherId,
        sessionId: course.sessionId,
        semesterId: course.semesterId,
        code: course.code,
        title: course.title,
        description: course.description,
        credits: course.credits,
        status: course.status,
        maxStudents: course.maxStudents,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        session: courseSession,
        semester: semester,
      })
      .from(course)
      .leftJoin(courseSession, eq(course.sessionId, courseSession.id))
      .leftJoin(semester, eq(course.semesterId, semester.id))
      .$dynamic();
  }

  async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(course)
      .leftJoin(courseSession, eq(course.sessionId, courseSession.id))
      .leftJoin(semester, eq(course.semesterId, semester.id))
      .where(and(...filters));
    return total;
  }
}

export const coursePaginationConfig = new CoursePaginationConfig();
