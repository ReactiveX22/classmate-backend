import { Injectable, Logger } from '@nestjs/common';
import { AdminSeeder } from './admin.seeder';
import { CourseSeeder } from './course.seeder';
import { StudentSeeder } from './student.seeder';
import { TeacherSeeder } from './teacher.seeder';
import { OrganizationSeeder } from './organization.seeder';

@Injectable()
export class SeedRunner {
  private readonly logger = new Logger('SeedRunner');

  constructor(
    private readonly adminSeeder: AdminSeeder,
    private readonly teacherSeeder: TeacherSeeder,
    private readonly studentSeeder: StudentSeeder,
    private readonly courseSeeder: CourseSeeder,
    private readonly organizationSeeder: OrganizationSeeder,
  ) {}

  async run(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');
    this.logger.log('');

    const startTime = Date.now();

    try {
      // Run seeders in order (respecting dependencies)
      await this.organizationSeeder.seed();
      this.logger.log('');

      await this.adminSeeder.seed();
      this.logger.log('');

      await this.teacherSeeder.seed();
      this.logger.log('');

      await this.studentSeeder.seed();
      this.logger.log('');

      await this.courseSeeder.seed();
      this.logger.log('');

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log('✅ Database seeding completed successfully!');
      this.logger.log(`⏱️  Total time: ${duration}s`);
    } catch (error: any) {
      this.logger.error('❌ Database seeding failed!', error.stack);
      throw error;
    }
  }
}
