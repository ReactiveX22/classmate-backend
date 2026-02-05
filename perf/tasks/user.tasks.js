/**
 * User Task Module
 *
 * Reusable task functions for user operations (teachers/students).
 */

import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { trackError } from '../lib/util.js';

// Metrics
const teacherListDuration = new Trend('task_teacher_list_duration', true);
const studentListDuration = new Trend('task_student_list_duration', true);

/**
 * List teachers
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Execution context
 * @returns {Object} - Response object
 */
export function listTeachers(client, context) {
  const startTime = Date.now();

  const res = client.get('/api/v1/teachers?page=1&limit=10', {
    tags: { endpoint: 'teachers_list', task: 'listTeachers' },
  });

  teacherListDuration.add(Date.now() - startTime);

  const success = check(res, {
    'teachers listed': (r) => r.status === 200,
  });

  if (!success) trackError(res);

  return res;
}

/**
 * List students
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Execution context
 * @returns {Object} - Response object
 */
export function listStudents(client, context) {
  const startTime = Date.now();

  const res = client.get('/api/v1/students?page=1&limit=10', {
    tags: { endpoint: 'students_list', task: 'listStudents' },
  });

  studentListDuration.add(Date.now() - startTime);

  const success = check(res, {
    'students listed': (r) => r.status === 200,
  });

  if (!success) trackError(res);

  return res;
}
