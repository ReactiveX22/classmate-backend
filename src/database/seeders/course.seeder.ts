import { Injectable } from '@nestjs/common';
import { CourseService } from 'src/course/services/course.service';
import { UserService } from 'src/user/services/user.service';
import { BaseSeeder } from './base.seeder';
import coursesData from './data/courses.json';

@Injectable()
export class CourseSeeder extends BaseSeeder {
  constructor(
    private readonly courseService: CourseService,
    private readonly userService: UserService,
  ) {
    super('Course');
  }

  async seed(): Promise<void> {
    this.log(`Starting course seeder for ${coursesData.length} courses...`);

    let created = 0;
    let skipped = 0;

    for (const courseData of coursesData) {
      try {
        // Check if course already exists (by code and semester)
        const existing = await this.courseService.findCourseByCodeAndSemester(
          courseData.code,
          courseData.semester,
        );
        if (existing) {
          this.warn(
            `Course ${courseData.code} for ${courseData.semester} already exists. Skipping.`,
          );
          skipped++;
          continue;
        }

        // Find teacher by email if provided
        let teacherId: string | undefined;
        if (courseData.teacherEmail) {
          const teacher = await this.userService.findUserByEmail(
            courseData.teacherEmail,
          );
          if (teacher) {
            const profile = await this.userService.findUserProfileByUserId(
              teacher.id,
            );
            if (profile) {
              const teacherRecord =
                await this.userService.findTeacherByUserProfileId(profile.id);
              if (teacherRecord) {
                teacherId = teacherRecord.id;
              }
            }
          }
          if (!teacherId) {
            this.warn(
              `Teacher with email ${courseData.teacherEmail} not found. Creating course without teacher assignment.`,
            );
          }
        }

        // Create course
        await this.courseService.createCourse({
          teacherId,
          code: courseData.code,
          title: courseData.title,
          description: courseData.description,
          credits: courseData.credits,
          semester: courseData.semester,
          maxStudents: courseData.maxStudents,
        });

        created++;
        this.log(
          `✓ Created course: ${courseData.code} - ${courseData.title}${teacherId ? ` (Teacher: ${courseData.teacherEmail})` : ' (No teacher assigned)'}`,
        );
      } catch (error: any) {
        this.error(
          `Failed to create course ${courseData.code}: ${error.message}`,
          error,
        );
      }
    }

    this.log(`Course seeder completed: ${created} created, ${skipped} skipped`);
  }
}
