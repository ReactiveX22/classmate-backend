import { Injectable } from '@nestjs/common';
import { CourseRepository } from '../repositories/course.repository';

@Injectable()
export class CourseService {
  constructor(private readonly courseRepository: CourseRepository) {}

  async createCourse(data: {
    teacherId?: string;
    code: string;
    title: string;
    description?: string;
    credits?: number;
    semester: string;
    maxStudents?: number;
  }) {
    // Check if course with same code and semester already exists
    const existing = await this.courseRepository.findByCodeAndSemester(
      data.code,
      data.semester,
    );
    if (existing) {
      throw new Error(
        `Course with code ${data.code} already exists for semester ${data.semester}`,
      );
    }

    return this.courseRepository.create(data);
  }

  async assignTeacher(courseId: string, teacherId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    return this.courseRepository.assignTeacher(courseId, teacherId);
  }

  async findCourseById(id: string) {
    return this.courseRepository.findById(id);
  }

  async findCourseByCodeAndSemester(code: string, semester: string) {
    return this.courseRepository.findByCodeAndSemester(code, semester);
  }

  async findCoursesByTeacher(teacherId: string) {
    return this.courseRepository.findByTeacherId(teacherId);
  }

  async findCoursesBySemester(semester: string) {
    return this.courseRepository.findBySemester(semester);
  }

  async updateCourse(id: string, data: Partial<Parameters<typeof this.courseRepository.update>[1]>) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new Error(`Course with id ${id} not found`);
    }

    return this.courseRepository.update(id, data);
  }
}

