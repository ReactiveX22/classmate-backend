/**
 * Load Test Scenario
 *
 * Normal load testing with weighted task selection.
 * Uses seeded data from onboarding workflow.
 *
 * Weight distribution (realistic usage):
 * - 60% read operations (list classrooms, posts, downloads)
 * - 30% write operations (create posts, classrooms)
 * - 10% heavy operations (uploads, attendance)
 */

import { check, group, sleep } from 'k6';
import { open } from 'k6/experimental/fs';
import { currentConfig } from '../config/env.js';
import { buildOptions } from '../config/options.js';
import { AuthHelper } from '../lib/auth.js';
import {
  generateUniqueData,
  getByVuIndex,
  getRandom,
  loadCsv,
} from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';
import { selectTask, weights } from '../lib/task-selector.js';
import { trackError } from '../lib/util.js';
import { allTasks } from '../tasks/index.js';

export const options = buildOptions({
  scenario: 'load',
  extraThresholds: {
    task_classroom_list_duration: ['p(95)<3000'],
    task_post_create_duration: ['p(95)<5000'],
    task_upload_duration: ['p(95)<10000'],
  },
});

// Load existing test users (seeded by onboarding)
const teachers = loadCsv('load_teachers', '../data/teachers.csv').slice(0, 100);
const classroomTemplates = loadCsv('load_classrooms', '../data/classrooms.csv');
const courses = loadCsv('load_courses', '../data/courses.csv');

// Load file data for uploads (will be null if file doesn't exist)
let fileData = null;
try {
  fileData = open(import.meta.resolve('../data/assets/sample.pdf'), 'b');
} catch (e) {
  console.warn('Sample PDF not found, upload tasks will be skipped');
}

/**
 * Load test function - simulates normal user behavior with weighted tasks
 */
export function loadTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();
  const uniqueData = generateUniqueData('load', __VU, __ITER);

  // Always use existing users (seeded data) for load tests
  group('Authentication', () => {
    const teacher = getByVuIndex(teachers, __VU);

    const startTime = Date.now();
    const signinRes = auth.signin(teacher.email, teacher.password);
    metrics.signinDuration.add(Date.now() - startTime);

    const success = check(signinRes, {
      'signin succeeded': (r) => r.status === 200,
    });

    if (!success) {
      trackError(signinRes);
      console.error(`[VU ${__VU}] Signin failed for ${teacher.email}`);
      metrics.workflowFailure.add(1);
    }

    sleep(0.3);
  });

  // Skip if not authenticated
  if (!auth.isAuthenticated()) {
    sleep(1);
    return;
  }

  // Session validation
  group('Session Check', () => {
    const startTime = Date.now();
    const sessionRes = auth.validateSession();
    metrics.sessionDuration.add(Date.now() - startTime);

    check(sessionRes, {
      'session valid': (r) => r.status === 200,
    });

    sleep(0.2);
  });

  // Build context for tasks
  const context = {
    uniqueId: uniqueData.id,
    // These would ideally come from a shared state or previous operations
    courseId: null,
    classroomId: null,
    classroomData: getRandom(classroomTemplates),
    fileData: fileData,
    fileName: 'sample.pdf',
  };

  // Hydrate Context (Fetch Courses & Classrooms)
  group('Hydrate Context', () => {
    // 1. Get Courses (needed to create classrooms)
    try {
      const coursesRes = allTasks.listCourses(client, context);
      if (coursesRes.status === 200) {
        const courses = JSON.parse(coursesRes.body);
        if (courses.length > 0) {
          // Pick a random course to operate on
          context.courseId = getRandom(courses).id;
        }
      }
    } catch (e) {
      console.error(`[VU ${__VU}] Failed to fetch courses: ${e.message}`);
    }

    // 2. Get Classrooms (needed for posts, uploads, etc.)
    try {
      const classroomsRes = allTasks.listClassrooms(client, context);
      if (classroomsRes.status === 200) {
        const classrooms = JSON.parse(classroomsRes.body);
        if (classrooms.length > 0) {
          // Pick a random classroom
          context.classroomId = getRandom(classrooms).id;
        }
      }
    } catch (e) {
      console.error(`[VU ${__VU}] Failed to fetch classrooms: ${e.message}`);
    }
  });

  // Execute weighted random tasks
  group('Weighted Tasks', () => {
    // Select and execute 3-5 tasks per iteration
    const taskCount = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < taskCount; i++) {
      let selectedTaskName = selectTask(weights.load);

      // CRITICAL: Ensure we have a classroom before trying to use one
      // If we don't have a classroomId, but we have a courseId, we MUST create a classroom first
      if (!context.classroomId && context.courseId) {
        selectedTaskName = 'createClassroom';
      } else if (!context.classroomId && !context.courseId) {
        // If we have neither, we can't do much - fallback to a read-only op that needs nothing
        // using listCourses instead of listTeachers as the latter is admin-only
        allTasks.listCourses(client, context);
        sleep(0.2);
        continue;
      }

      // Skip upload tasks if no file data
      if (
        !fileData &&
        (selectedTaskName === 'uploadFile' ||
          selectedTaskName === 'createPostWithAttachment' ||
          selectedTaskName === 'downloadFile')
      ) {
        continue;
      }

      // Skip tasks that require specific context we don't have
      if (
        (selectedTaskName === 'createClassroom' && !context.courseId) ||
        (selectedTaskName === 'createSimplePost' && !context.classroomId) ||
        (selectedTaskName === 'createPostWithAttachment' &&
          !context.classroomId) ||
        (selectedTaskName === 'joinClassroom' && !context.classroomCode) ||
        (selectedTaskName === 'markAttendance' && !context.classroomId) ||
        (selectedTaskName === 'listPosts' && !context.classroomId) ||
        (selectedTaskName === 'downloadFile' && !context.classroomId) ||
        (selectedTaskName === 'uploadFile' && !context.classroomId)
      ) {
        // Fall back to list operations
        allTasks.listCourses(client, context);
        sleep(0.2);
        continue;
      }

      // Execute the selected task
      const taskFn = allTasks[selectedTaskName];
      if (typeof taskFn === 'function') {
        try {
          taskFn(client, context);
        } catch (e) {
          console.error(
            `[VU ${__VU}] Task ${selectedTaskName} error: ${e.message}`,
          );
        }
      }

      sleep(0.2);
    }
  });

  // Additional API operations (legacy compatibility)
  group('API Operations', () => {
    // List students with pagination (Instructors allowed)
    allTasks.listStudents(client, context);
    sleep(0.3);

    // List courses (Instructors allowed)
    allTasks.listCourses(client, context);
    sleep(0.2);
  });

  // Think time (simulates user reading/thinking)
  sleep(Math.random() * 2 + 1);
}

/**
 * Default export
 */
export default loadTest;
