/**
 * Teacher Day Workflow
 *
 * Simulates a typical teacher's day:
 * 1. Login
 * 2. View Classrooms
 * 3. Create Post/Assignment
 * 4. View Students (placeholder)
 */

import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import { loadCsv, getByVuIndex } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';

const workflowDuration = new Trend('workflow_teacher_day_duration', true);
const workflowComplete = new Counter('workflow_teacher_day_complete');

// Load teacher test data
let teachers = [];
try {
  teachers = loadCsv('teacher_day_teachers', '../data/teachers.csv');
} catch (e) {
  console.warn('No teachers.csv found, workflow may fail');
}

/**
 * Teacher day workflow
 */
export function teacherDayWorkflow() {
  const workflowStart = Date.now();
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();

  // Must have test teachers
  if (teachers.length === 0) {
    console.error('No teacher data available');
    return { success: false, reason: 'no_data' };
  }

  const teacher = getByVuIndex(teachers, __VU);

  // ================================================
  // Step 1: Teacher Login
  // ================================================
  group('Teacher Login', () => {
    const startTime = Date.now();
    const res = auth.signin(teacher.email, teacher.password);
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
  group('View Classrooms', () => {
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
  // Step 3: View Students
  // ================================================
  group('View Students', () => {
    const startTime = Date.now();
    const res = client.get('/api/v1/students', {
      tags: { endpoint: 'crud' },
    });
    metrics.crudReadDuration.add(Date.now() - startTime);

    check(res, {
      'students loaded': (r) => r.status === 200,
    });

    sleep(0.5);
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
export default teacherDayWorkflow;
