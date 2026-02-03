/**
 * Student Day Workflow
 *
 * Simulates a typical student's day:
 * 1. Login
 * 2. View Enrolled Classrooms
 * 3. Check Session
 */

import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import { loadCsv, getByVuIndex } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';

const workflowDuration = new Trend('workflow_student_day_duration', true);
const workflowComplete = new Counter('workflow_student_day_complete');

// Load student test data
let students = [];
try {
  students = loadCsv('student_day_students', '../data/students.csv');
} catch (e) {
  console.warn('No students.csv found, workflow may fail');
}

/**
 * Student day workflow
 */
export function studentDayWorkflow() {
  const workflowStart = Date.now();
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();

  // Must have test students
  if (students.length === 0) {
    console.error('No student data available');
    return { success: false, reason: 'no_data' };
  }

  const student = getByVuIndex(students, __VU);

  // ================================================
  // Step 1: Student Login
  // ================================================
  group('Student Login', () => {
    const startTime = Date.now();
    const res = auth.signin(student.email, student.password);
    metrics.signinDuration.add(Date.now() - startTime);

    check(res, {
      'login successful': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  if (!auth.isAuthenticated()) {
    return { success: false, reason: 'auth_failed' };
  }

  // ================================================
  // Step 2: View Classrooms
  // ================================================
  group('View My Classrooms', () => {
    const startTime = Date.now();
    const res = client.get('/api/v1/classrooms', {
      tags: { endpoint: 'classrooms_list' },
    });
    metrics.classroomListDuration.add(Date.now() - startTime);

    check(res, {
      'classrooms loaded': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  // ================================================
  // Step 3: Validate Session
  // ================================================
  group('Check Session', () => {
    const startTime = Date.now();
    const res = auth.validateSession();
    metrics.sessionDuration.add(Date.now() - startTime);

    check(res, {
      'session valid': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Record workflow completion
  const totalDuration = Date.now() - workflowStart;
  workflowDuration.add(totalDuration);
  workflowComplete.add(1);

  return { success: true, duration: totalDuration };
}

/**
 * Default export
 */
export default studentDayWorkflow;
