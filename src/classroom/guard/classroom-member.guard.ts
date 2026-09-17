import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  ApplicationBadRequestException,
  ApplicationForbiddenException,
} from 'src/common/exceptions/application.exception';
import { AuthenticatedRequest } from 'src/common/types/request.types';
import { type DB, InjectDb } from 'src/database/db.provider';
import { classroom, classroomMembers } from 'src/database/schema';

@Injectable()
export class ClassroomMemberGuard implements CanActivate {
  constructor(@InjectDb() private readonly db: DB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.session?.user;
    const classroomId = request.params.classroomId;

    if (!user) {
      throw new ApplicationForbiddenException(
        'You do not have access to this classroom',
      );
    }

    if (typeof classroomId !== 'string') {
      throw new ApplicationBadRequestException('Invalid classroom identifier');
    }

    const isStudent = await this.db.query.classroomMembers.findFirst({
      where: and(
        eq(classroomMembers.classroomId, classroomId),
        eq(classroomMembers.studentId, user.id),
      ),
    });

    const isTeacher = await this.db.query.classroom.findFirst({
      where: and(
        eq(classroom.id, classroomId),
        eq(classroom.teacherId, user.id),
      ),
    });

    const isMember = isStudent || isTeacher;

    if (!isMember) {
      throw new ApplicationForbiddenException(
        'You do not have access to this classroom',
      );
    }

    return true;
  }
}
