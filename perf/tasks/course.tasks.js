/**
 * Course Task Module
 *
 * Reusable task functions for course operations.
 */

import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { trackError } from '../lib/util.js';

// Metrics
const courseListDuration = new Trend('task_course_list_duration', true);

/**
 * List all courses
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Execution context
 * @returns {Object} - Response object
 */
export function listCourses(client, context) {
  const startTime = Date.now();

  const res = client.get('/api/v1/courses?page=1&limit=10', {
    tags: { endpoint: 'courses_list', task: 'listCourses' },
  });

  courseListDuration.add(Date.now() - startTime);

  const success = check(res, {
    'courses listed': (r) => r.status === 200,
  });

  if (!success) trackError(res);

  return res;
}
