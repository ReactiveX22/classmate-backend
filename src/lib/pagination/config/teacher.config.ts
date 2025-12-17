import { SQL, and, count, eq } from 'drizzle-orm';
import { type DB } from 'src/database/db.provider';
import { teacher, user, userProfile } from 'src/database/schema';

export class TeacherPaginationConfig {
  static readonly searchableFields = [
    user.name,
    user.email,
    teacher.id,
    teacher.title,
  ];

  static readonly sortFields = {
    name: user.name,
    email: user.email,
    teacherId: teacher.id,
    title: teacher.title,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  } as const;

  static getBaseQuery(db: DB) {
    return db
      .select({
        teacher: {
          id: teacher.id,
          title: teacher.title,
          createdAt: teacher.createdAt,
          updatedAt: teacher.updatedAt,
        },
        userProfile: {
          id: userProfile.id,
          phone: userProfile.phone,
          bio: userProfile.bio,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
        },
      })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(teacher, eq(userProfile.userId, teacher.userId))
      .$dynamic();
  }

  static async getCountQuery(db: DB, filters: SQL[]) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .leftJoin(userProfile, eq(user.id, userProfile.userId))
      .leftJoin(teacher, eq(userProfile.userId, teacher.userId))
      .where(and(...filters));
    return total;
  }
}
