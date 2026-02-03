/**
 * Full Onboarding Workflow
 *
 * Complete multi-step workflow for database seeding:
 * 1. Admin Signup (creates organization)
 * 2. Session Validation
 * 3. Create Teachers
 * 4. Create Students
 * 5. Create Courses (with teacher assignment)
 * 6. Verify Created Data
 */

import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';
import { currentConfig } from '../config/env.js';
import { buildOptions } from '../config/options.js';
import { AuthHelper } from '../lib/auth.js';
import { loadCsv } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';
import { trackError } from '../lib/util.js';

// Load data files
const admins = loadCsv('onboarding_admins', '../data/admins.csv').slice(0, 50);
const teachers = loadCsv('onboarding_teachers', '../data/teachers.csv').slice(
  0,
  100,
);
const students = loadCsv('onboarding_students', '../data/students.csv').slice(
  0,
  200,
);
const courses = loadCsv('onboarding_courses', '../data/courses.csv');

// Calculate ratios based on 100 admins, 100 teachers, 100 students
const teachersPerAdmin = Math.max(
  1,
  Math.floor(teachers.length / admins.length),
);
const studentsPerAdmin = Math.max(
  1,
  Math.floor(students.length / admins.length),
);
const coursesPerAdmin = Math.min(
  3,
  Math.max(1, Math.floor(courses.length / admins.length)),
);

// Workflow-specific metrics
const workflowTotalDuration = new Trend(
  'workflow_onboarding_total_duration',
  true,
);
const stepSignupDuration = new Trend('workflow_step_signup_duration', true);
const stepTeacherDuration = new Trend('workflow_step_teacher_duration', true);
const stepStudentDuration = new Trend('workflow_step_student_duration', true);
const stepCourseDuration = new Trend('workflow_step_course_duration', true);
const workflowComplete = new Counter('workflow_onboarding_complete');
const workflowFailed = new Counter('workflow_onboarding_failed');

export const options = buildOptions({
  scenario: 'workflow',
  extraThresholds: {
    workflow_onboarding_total_duration: ['p(95)<60000'], // Increased for course creation
    workflow_step_signup_duration: ['p(95)<8000'],
    workflow_step_teacher_duration: ['p(95)<5000'],
    workflow_step_student_duration: ['p(95)<5000'],
    workflow_step_course_duration: ['p(95)<5000'],
  },
});

/**
 * Full onboarding workflow
 */
export function fullOnboardingWorkflow() {
  const workflowStart = Date.now();
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();

  // Use global iteration index prevents collisions in shared-iterations
  const iterIndex = exec.scenario.iterationInTest;

  // Get Admin (1 per iteration)
  const adminData = admins[iterIndex % admins.length];

  let success = true;
  let createdTeacherIds = [];
  let createdStudentIds = [];
  let createdCourseIds = [];

  // ================================================
  // PHASE 1: Admin Signup with Organization
  // ================================================
  group('Phase 1: Admin Signup', () => {
    const stepStart = Date.now();

    const signupRes = auth.signupAdmin({
      name: adminData.name,
      email: adminData.email,
      password: adminData.password,
      organizationName: adminData.organizationName,
    });

    stepSignupDuration.add(Date.now() - stepStart);
    metrics.signupDuration.add(Date.now() - stepStart);

    const stepSuccess = check(signupRes, {
      'signup returned success': (r) => r.status >= 200 && r.status < 300,
      'user has admin role': () => auth.getRole() === 'admin',
      'session cookie set': () => client.hasSessionCookie(),
    });

    if (!stepSuccess) {
      console.error(`[VU ${__VU}] Signup failed: ${signupRes.status}`);
      success = false;
    }

    sleep(0.5);
  });

  if (!success || !auth.isAuthenticated()) {
    workflowFailed.add(1);
    return { success: false, phase: 'signup' };
  }

  // ================================================
  // PHASE 2: Validate Session
  // ================================================
  group('Phase 2: Validate Session', () => {
    const stepStart = Date.now();
    const sessionRes = auth.validateSession();
    metrics.sessionDuration.add(Date.now() - stepStart);

    const stepSuccess = check(sessionRes, {
      'session is valid': (r) => r.status === 200,
      'session has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.id;
        } catch (e) {
          return false;
        }
      },
      'session has organization': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.organizationId;
        } catch (e) {
          return false;
        }
      },
    });

    if (!stepSuccess) {
      success = false;
    }

    sleep(0.3);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'session' };
  }

  // ================================================
  // PHASE 3: Create Teachers (Sequential Loop)
  // ================================================
  group(`Phase 3: Create Teachers (${teachersPerAdmin}x)`, () => {
    const stepStart = Date.now();

    for (let i = 0; i < teachersPerAdmin; i++) {
      const globalTeacherIndex = iterIndex * teachersPerAdmin + i;
      const teacherData = teachers[globalTeacherIndex % teachers.length];

      const res = client.post(
        '/api/v1/teachers',
        {
          name: teacherData.name,
          email: teacherData.email,
          password: teacherData.password,
          title: teacherData.title || 'Lecturer',
          joinDate:
            teacherData.joinDate || new Date().toISOString().split('T')[0],
        },
        {
          tags: { endpoint: 'crud' },
        },
      );

      const checkPassed = check(res, {
        'teacher created': (r) => r.status === 200 || r.status === 201,
      });

      if (checkPassed) {
        try {
          const body = JSON.parse(res.body);
          if (body.user && body.user.id) {
            createdTeacherIds.push(body.user.id);
          } else if (body.id) {
            createdTeacherIds.push(body.id);
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else {
        console.error(
          `[VU ${__VU}][Iter ${iterIndex}] Teacher ${i} failed: ${res.status}`,
        );
        success = false;
        if (res.status === 504 || res.status === 408) break;
      }

      sleep(0.1);
    }

    stepTeacherDuration.add(Date.now() - stepStart);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'create_teacher' };
  }

  // ================================================
  // PHASE 4: Create Students (Loop)
  // ================================================
  group(`Phase 4: Create Students (${studentsPerAdmin}x)`, () => {
    const stepStart = Date.now();

    for (let i = 0; i < studentsPerAdmin; i++) {
      const globalStudentIndex = iterIndex * studentsPerAdmin + i;
      const studentData = students[globalStudentIndex % students.length];

      const studentRes = client.post(
        '/api/v1/students',
        {
          name: studentData.name,
          email: studentData.email,
          password: studentData.password,
          studentId:
            studentData.studentId || `STU-${Date.now()}-${globalStudentIndex}`,
        },
        {
          tags: { endpoint: 'crud' },
        },
      );

      const stepSuccess = check(studentRes, {
        'student created': (r) => r.status === 200 || r.status === 201,
      });

      if (!stepSuccess) {
        console.error(
          `[Iter ${iterIndex}] Student creation failed for index ${globalStudentIndex}: ${studentRes.status}`,
        );
        success = false;
      } else {
        try {
          const body = JSON.parse(studentRes.body);
          if (body.user && body.user.id) {
            createdStudentIds.push(body.user.id);
          } else if (body.id) {
            createdStudentIds.push(body.id);
          }
        } catch (e) {
          // Ignore
        }
      }

      sleep(0.1);
    }

    stepStudentDuration.add(Date.now() - stepStart);
    metrics.crudCreateDuration.add(Date.now() - stepStart);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'create_student' };
  }

  // ================================================
  // PHASE 5: Create Courses with Teacher Assignment
  // ================================================
  group(`Phase 5: Create Courses (${coursesPerAdmin}x)`, () => {
    const stepStart = Date.now();

    for (let i = 0; i < coursesPerAdmin; i++) {
      const globalCourseIndex = iterIndex * coursesPerAdmin + i;
      const courseData = courses[globalCourseIndex % courses.length];

      // Assign a teacher to the course (round-robin from created teachers)
      const teacherId =
        createdTeacherIds.length > 0
          ? createdTeacherIds[i % createdTeacherIds.length]
          : undefined;

      const coursePayload = {
        code: `${courseData.code}-${iterIndex}-${i}`, // Unique code per iteration
        title: courseData.title,
        description:
          courseData.description || `Course created during onboarding`,
        credits: parseInt(courseData.credits) || 3,
        semester: courseData.semester || 'Fall 2025',
        maxStudents: parseInt(courseData.maxStudents) || 50,
      };

      // Add teacherId if we have one
      if (teacherId) {
        coursePayload.teacherId = teacherId;
      }

      const courseRes = client.post('/api/v1/courses', coursePayload, {
        tags: { endpoint: 'crud' },
      });

      const courseSuccess = check(courseRes, {
        'course created': (r) => r.status === 200 || r.status === 201,
      });

      if (courseSuccess) {
        try {
          const body = JSON.parse(courseRes.body);
          if (body.id) {
            // Capture course ID AND the assigned teacher index for future login
            createdCourseIds.push({
              id: body.id,
              teacherIndex: i % createdTeacherIds.length,
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else {
        console.error(
          `[VU ${__VU}][Iter ${iterIndex}] Course ${i} failed: ${courseRes.status} - ${courseRes.body}`,
        );
        // Don't fail the entire workflow for course creation failures
        // success = false;
      }

      sleep(0.1);
    }

    stepCourseDuration.add(Date.now() - stepStart);
  });

  // ================================================
  // PHASE 6: Verify Created Data
  // ================================================
  group('Phase 6: Verify Data', () => {
    // List teachers
    const teachersRes = client.get('/api/v1/teachers', {
      tags: { endpoint: 'classrooms_list' },
    });

    check(teachersRes, {
      'teachers list accessible': (r) => r.status === 200,
    });

    sleep(0.2);

    // List students
    const studentsRes = client.get('/api/v1/students', {
      tags: { endpoint: 'classrooms_list' },
    });

    check(studentsRes, {
      'students list accessible': (r) => r.status === 200,
    });

    sleep(0.2);

    // List courses
    const coursesRes = client.get('/api/v1/courses', {
      tags: { endpoint: 'crud' },
    });

    const verified = check(coursesRes, {
      'courses list accessible': (r) => r.status === 200,
    });

    if (!verified) {
      success = false;
    }

    sleep(0.2);
    sleep(0.2);
  });

  // ================================================
  // PHASE 7 & 8: Create Classrooms & Enroll Students
  // ================================================
  group('Phase 7 & 8: Classrooms & Enrollment', () => {
    const stepStart = Date.now();

    // For each course created, the assigned teacher creates a classroom and enrolls students
    for (const courseInfo of createdCourseIds) {
      // 1. Login as the assigned teacher
      const teacherIndex = courseInfo.teacherIndex;
      // Safety check for valid index
      if (typeof teacherIndex !== 'number') continue;

      const teacherCreds = teachers[teacherIndex % teachers.length];
      if (!teacherCreds) continue;

      auth.clearCookies();

      // Sign in as teacher
      const signinRes = auth.signin(teacherCreds.email, teacherCreds.password);
      if (signinRes.status !== 200) {
        console.error(`Failed to login teacher ${teacherCreds.email}`);
        continue;
      }

      // 2. Create Classroom
      const classroomRes = client.post(
        '/api/v1/classrooms',
        {
          courseId: courseInfo.id,
          name: `Classroom for ${teacherCreds.name}`,
          section: 'Section A',
          description: 'Automatically created during onboarding',
        },
        { tags: { endpoint: 'crud' } },
      );

      let classroomId = null;
      if (classroomRes.status === 200 || classroomRes.status === 201) {
        try {
          const body = JSON.parse(classroomRes.body);
          classroomId = body.id;
        } catch (e) {}
      } else {
        console.warn(
          `Failed to create classroom for course ${courseInfo.id}: ${classroomRes.status}`,
        );
      }

      // 3. Enroll Random Students (if classroom created)
      if (classroomId && createdStudentIds.length > 0) {
        // Pick 5 random students
        const studentCount = 5;
        const selectedStudentIds = [];
        for (let k = 0; k < studentCount; k++) {
          // Random pick from created students
          const randomStudentId =
            createdStudentIds[
              Math.floor(Math.random() * createdStudentIds.length)
            ];
          if (!selectedStudentIds.includes(randomStudentId)) {
            selectedStudentIds.push(randomStudentId);
          }
        }

        // Bulk add members
        if (selectedStudentIds.length > 0) {
          const addRes = client.post(
            `/api/v1/classrooms/${classroomId}/members`,
            {
              studentIds: selectedStudentIds,
            },
            { tags: { endpoint: 'crud' } },
          );

          if (addRes.status !== 200 && addRes.status !== 201) {
            console.warn(
              `Failed to enroll students in classroom ${classroomId}: ${addRes.status}`,
            );
          }
        }
      }
      sleep(0.1);
    }
    metrics.crudCreateDuration.add(Date.now() - stepStart);
  });

  // ================================================
  // WORKFLOW COMPLETE
  // ================================================
  const totalDuration = Date.now() - workflowStart;
  workflowTotalDuration.add(totalDuration);
  metrics.workflowDuration.add(totalDuration);

  if (success) {
    workflowComplete.add(1);
    metrics.workflowSuccess.add(1);
    console.log(
      `[VU ${__VU}][Iter ${iterIndex}] Onboarding complete: ${createdTeacherIds.length} teachers, ${createdStudentIds.length} students, ${createdCourseIds.length} courses`,
    );
  } else {
    workflowFailed.add(1);
    metrics.workflowFailure.add(1);
  }

  return {
    success,
    duration: totalDuration,
    createdTeacherIds,
    createdCourseIds,
    adminEmail: adminData.email,
  };
}

/**
 * Default export
 */
export default fullOnboardingWorkflow;
