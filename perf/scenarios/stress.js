/**
 * Stress Test Scenario
 *
 * Find breaking point by ramping up to high VU counts.
 * Uses seeded data from onboarding workflow.
 *
 * Weight distribution (heavier writes + uploads):
 * - 40% read operations
 * - 40% write operations
 * - 20% heavy operations (uploads, attendance)
 */

import { check, group, sleep } from 'k6';
import { open } from 'k6/experimental/fs';
import { currentConfig } from '../config/env.js';
import { buildOptions } from '../config/options.js';
import { AuthHelper } from '../lib/auth.js';
import { generateUniqueData, getRandom, loadCsv } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';
import { selectTask, weights } from '../lib/task-selector.js';
import { trackError } from '../lib/util.js';
import { allTasks } from '../tasks/index.js';

export const options = buildOptions({
  scenario: 'stress',
  extraThresholds: {
    // Relaxed thresholds for stress testing
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.30'],
    task_upload_duration: ['p(95)<15000'],
  },
});

// Load teachers for signin
const teachers = loadCsv('stress_teachers', '../data/teachers.csv').slice(
  0,
  100,
);
const classroomTemplates = loadCsv(
  'stress_classrooms',
  '../data/classrooms.csv',
);

// Load file data for uploads
let fileData = null;
try {
  fileData = open(import.meta.resolve('../data/assets/sample.pdf'), 'b');
} catch (e) {
  console.warn('Sample PDF not found, upload stress tests will be limited');
}

/**
 * Stress test function - pushes the system to its limits
 */
export function stressTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();
  const uniqueData = generateUniqueData('stress', __VU, __ITER);

  // Track active users
  metrics.activeUsers.add(__VU);

  // 1. Signin (lighter than signup, but we test high volume)
  group('Stress Signin', () => {
    const teacher = getRandom(teachers);
    const startTime = Date.now();

    // Use random teacher from CSV
    const signinRes = auth.signin(teacher.email, teacher.password);
    metrics.signinDuration.add(Date.now() - startTime);

    const success = check(auth.isAuthenticated(), {
      'signin succeeded': (isAuth) => isAuth === true,
    });

    if (!success) {
      trackError(signinRes);
      metrics.workflowFailure.add(1);
    }

    sleep(0.2);
  });

  if (!auth.isAuthenticated()) {
    sleep(0.5);
    return;
  }

  // 2. Rapid session checks (tests session lookup performance)
  group('Rapid Session Checks', () => {
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      const res = auth.validateSession();
      metrics.sessionDuration.add(Date.now() - startTime);

      check(res, {
        'session valid': (r) => r.status === 200,
      });

      sleep(0.1);
    }
  });

  // Build context for stress tasks
  const context = {
    uniqueId: uniqueData.id,
    classroomData: getRandom(classroomTemplates),
    fileData: fileData,
    fileName: 'sample.pdf',
    // In a real scenario, these would come from previous operations or shared state
    courseId: null,
    classroomId: null,
  };

  // Hydrate Context (Fetch Courses & Classrooms for Stress)
  group('Hydrate Context', () => {
    // 1. Get Courses
    if (Math.random() < 0.2) {
      // Only 20% of VUs do this in stress to avoid storming
      try {
        const coursesRes = allTasks.listCourses(client, context);
        if (coursesRes.status === 200) {
          const courses = JSON.parse(coursesRes.body);
          if (courses.length > 0) context.courseId = getRandom(courses).id;
        }
      } catch (e) {}
    }

    // 2. Get Classrooms
    if (Math.random() < 0.2) {
      try {
        const classroomsRes = allTasks.listClassrooms(client, context);
        if (classroomsRes.status === 200) {
          const classrooms = JSON.parse(classroomsRes.body);
          if (classrooms.length > 0)
            context.classroomId = getRandom(classrooms).id;
        }
      } catch (e) {}
    }
  });

  // 3. Execute weighted stress tasks
  group('Stress Tasks', () => {
    const taskCount = Math.floor(Math.random() * 3) + 4; // 4-6 tasks

    for (let i = 0; i < taskCount; i++) {
      let selectedTaskName = selectTask(weights.stress);

      // Enforce creation if missing context
      if (!context.classroomId && context.courseId) {
        selectedTaskName = 'createClassroom';
      }

      // Skip upload tasks if no file data
      if (
        !fileData &&
        (selectedTaskName === 'uploadFile' ||
          selectedTaskName === 'createPostWithAttachment')
      ) {
        // Fall back to list operation (using listCourses instead of admin-only listTeachers)
        allTasks.listCourses(client, context);
        sleep(0.1);
        continue;
      }

      // Skip tasks that need complex context
      if (
        (selectedTaskName === 'createClassroom' && !context.courseId) ||
        (selectedTaskName === 'createSimplePost' && !context.classroomId) ||
        (selectedTaskName === 'createPostWithAttachment' &&
          !context.classroomId) ||
        (selectedTaskName === 'markAttendance' && !context.classroomId) ||
        (selectedTaskName === 'listPosts' && !context.classroomId) ||
        (selectedTaskName === 'downloadFile' && !context.classroomId) ||
        (selectedTaskName === 'uploadFile' && !context.classroomId) ||
        (selectedTaskName === 'joinClassroom' && !context.classroomCode)
      ) {
        // Fall back to list operations
        allTasks.listCourses(client, context);
        sleep(0.05);
        continue;
      }

      // Execute the task
      const taskFn = allTasks[selectedTaskName];
      if (typeof taskFn === 'function') {
        try {
          taskFn(client, context);
        } catch (e) {
          console.error(
            `[VU ${__VU}] Stress task ${selectedTaskName} error: ${e.message}`,
          );
        }
      }

      sleep(0.05);
    }
  });

  // 4. API bombardment
  group('API Stress', () => {
    // Multiple rapid requests using tasks
    allTasks.listStudents(client, context);
    sleep(0.05);
    allTasks.listCourses(client, context);
    sleep(0.05);
    allTasks.listClassrooms(client, context);
    sleep(0.05);
  });

  // 5. Create operations (if still authenticated)
  if (auth.isAuthenticated() && context.courseId) {
    group('Create Operations', () => {
      // Try to create a classroom (Instructor allowed)
      allTasks.createClassroom(client, context);
      sleep(0.1);
    });
  }

  // Minimal think time under stress
  sleep(0.2);
}

/**
 * Default export
 */
export default stressTest;
