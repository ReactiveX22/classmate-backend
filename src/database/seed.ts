import { NestFactory } from '@nestjs/core';
import { SeederAppModule } from './seeders/seeder-app.module';
import { AdminSeeder } from './seeders/admin.seeder';
import { CourseSeeder } from './seeders/course.seeder';
import { SeedRunner } from './seeders/seed.runner';
import { StudentSeeder } from './seeders/student.seeder';
import { TeacherSeeder } from './seeders/teacher.seeder';
import { OrganizationSeeder } from './seeders/organization.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeederAppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    // Get seeders from DI container
    const adminSeeder = app.get(AdminSeeder);
    const teacherSeeder = app.get(TeacherSeeder);
    const studentSeeder = app.get(StudentSeeder);
    const courseSeeder = app.get(CourseSeeder);
    const orgSeeder = app.get(OrganizationSeeder);

    const seedRunner = new SeedRunner(
      adminSeeder,
      teacherSeeder,
      studentSeeder,
      courseSeeder,
      orgSeeder,
    );

    await seedRunner.run();

    process.exit(0);
  } catch (error) {
    console.error('Seeder failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
