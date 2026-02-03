/**
 * Classroom Task Module
 *
 * Reusable task functions for classroom operations.
 * Used by load/spike/stress test scenarios.
 */

import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { trackError } from '../lib/util.js';

// Metrics
const classroomCreateDuration = new Trend(
  'task_classroom_create_duration',
  true,
);
const classroomListDuration = new Trend('task_classroom_list_duration', true);
const classroomJoinDuration = new Trend('task_classroom_join_duration', true);
const classroomCreateSuccess = new Counter('task_classroom_create_success');
const classroomCreateFailure = new Counter('task_classroom_create_failure');

/**
 * List all classrooms for the authenticated user
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Execution context with courseId, etc.
 * @returns {Object} - Response object
 */
export function listClassrooms(client, context) {
  const startTime = Date.now();

  const res = client.get('/api/v1/classrooms?page=1&limit=10', {
    tags: { endpoint: 'classrooms_list', task: 'listClassrooms' },
  });

  classroomListDuration.add(Date.now() - startTime);

  const success = check(res, {
    'classrooms listed': (r) => r.status === 200,
  });

  if (!success) trackError(res);

  return res;
}

/**
 * Create a new classroom
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Must contain: courseId, classroomData (name, section, description)
 * @returns {Object} - Response with created classroom
 */
export function createClassroom(client, context) {
  const { courseId, classroomData, uniqueId } = context;

  if (!courseId) {
    console.error('[createClassroom] Missing courseId in context');
    classroomCreateFailure.add(1);
    return null;
  }

  const payload = {
    courseId: courseId,
    name: classroomData?.name || `Classroom ${uniqueId}`,
    section: classroomData?.section || 'Section A',
    description: classroomData?.description || 'Performance test classroom',
  };

  const startTime = Date.now();

  const res = client.post('/api/v1/classrooms', payload, {
    tags: { endpoint: 'classrooms_create', task: 'createClassroom' },
  });

  classroomCreateDuration.add(Date.now() - startTime);

  const success = check(res, {
    'classroom created': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    classroomCreateSuccess.add(1);
    try {
      const body = JSON.parse(res.body);
      if (body.id) {
        context.classroomId = body.id;
      }
    } catch (e) {
      console.warn(
        '[createClassroom] Failed to parse response body to extract ID',
      );
    }
  } else {
    classroomCreateFailure.add(1);
    trackError(res);
    console.error(`[createClassroom] Failed: ${res.status} - ${res.body}`);
  }

  return res;
}

/**
 * Join a classroom using invite code
 *
 * @param {Object} client - HTTP client with auth (student)
 * @param {Object} context - Must contain: classroomCode
 * @returns {Object} - Response object
 */
export function joinClassroom(client, context) {
  const { classroomCode } = context;

  if (!classroomCode) {
    console.error('[joinClassroom] Missing classroomCode in context');
    return null;
  }

  const startTime = Date.now();

  const res = client.post(
    '/api/v1/classrooms/join',
    { code: classroomCode },
    {
      tags: { endpoint: 'classrooms_join', task: 'joinClassroom' },
    },
  );

  classroomJoinDuration.add(Date.now() - startTime);

  const success = check(res, {
    'classroom joined': (r) => r.status === 200 || r.status === 201,
  });

  if (!success) trackError(res);

  return res;
}

/**
 * Get a specific classroom by ID
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Must contain: classroomId
 * @returns {Object} - Response with classroom details
 */
export function getClassroom(client, context) {
  const { classroomId } = context;

  if (!classroomId) {
    console.error('[getClassroom] Missing classroomId in context');
    return null;
  }

  const res = client.get(`/api/v1/classrooms/${classroomId}`, {
    tags: { endpoint: 'classrooms_get', task: 'getClassroom' },
  });

  const success = check(res, {
    'classroom retrieved': (r) => r.status === 200,
  });

  if (!success) trackError(res);

  return res;
}

/**
 * Leave a classroom (student only)
 *
 * @param {Object} client - HTTP client with auth (student)
 * @param {Object} context - Must contain: classroomId
 * @returns {Object} - Response object
 */
export function leaveClassroom(client, context) {
  const { classroomId } = context;

  if (!classroomId) {
    console.error('[leaveClassroom] Missing classroomId in context');
    return null;
  }

  const res = client.post(
    `/api/v1/classrooms/${classroomId}/members/leave`,
    {},
    {
      tags: { endpoint: 'classrooms_leave', task: 'leaveClassroom' },
    },
  );

  const success = check(res, {
    'left classroom': (r) => r.status === 204 || r.status === 200,
  });

  if (!success) trackError(res);

  return res;
}
