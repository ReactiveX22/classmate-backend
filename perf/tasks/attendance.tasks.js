/**
 * Attendance Task Module
 *
 * Task functions for attendance operations.
 */

import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Metrics
const attendanceMarkDuration = new Trend('task_attendance_mark_duration', true);
const attendanceListDuration = new Trend('task_attendance_list_duration', true);
const attendanceSuccess = new Counter('task_attendance_success');
const attendanceFailure = new Counter('task_attendance_failure');

/**
 * Attendance status enum
 */
export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

/**
 * Mark attendance for students (teacher action)
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, attendanceData
 * @returns {Object} - Response object
 */
export function markAttendance(client, context) {
  const { classroomId, attendanceData } = context;

  if (!classroomId) {
    console.error('[markAttendance] Missing classroomId in context');
    attendanceFailure.add(1);
    return null;
  }

  const payload = attendanceData || {
    date: new Date().toISOString().split('T')[0],
    records: [],
  };

  const startTime = Date.now();

  const res = client.post(
    `/api/v1/classrooms/${classroomId}/attendance`,
    payload,
    {
      tags: { endpoint: 'attendance_mark', task: 'markAttendance' },
    },
  );

  attendanceMarkDuration.add(Date.now() - startTime);

  const success = check(res, {
    'attendance marked': (r) =>
      r.status === 200 || r.status === 201 || r.status === 204,
  });

  if (success) {
    attendanceSuccess.add(1);
  } else {
    attendanceFailure.add(1);
  }

  return res;
}

/**
 * List attendance records for a classroom
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Must contain: classroomId
 * @returns {Object} - Response with attendance records
 */
export function listAttendance(client, context) {
  const { classroomId } = context;

  if (!classroomId) {
    console.error('[listAttendance] Missing classroomId in context');
    return null;
  }

  const startTime = Date.now();

  const res = client.get(`/api/v1/classrooms/${classroomId}/attendance`, {
    tags: { endpoint: 'attendance_list', task: 'listAttendance' },
  });

  attendanceListDuration.add(Date.now() - startTime);

  check(res, {
    'attendance listed': (r) => r.status === 200,
  });

  return res;
}
