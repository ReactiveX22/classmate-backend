/**
 * Tasks Module Index
 *
 * Central registry of all task functions.
 * Exports all tasks in a unified interface for use by test scenarios.
 */

// Import all task modules
import * as classroomTasks from './classroom.tasks.js';
import * as postTasks from './post.tasks.js';
import * as uploadTasks from './upload.tasks.js';
import * as attendanceTasks from './attendance.tasks.js';

// Re-export all tasks
export { classroomTasks, postTasks, uploadTasks, attendanceTasks };

/**
 * Unified task registry
 * Maps task names to their implementations
 */
export const allTasks = {
  // Classroom tasks
  listClassrooms: classroomTasks.listClassrooms,
  createClassroom: classroomTasks.createClassroom,
  joinClassroom: classroomTasks.joinClassroom,
  getClassroom: classroomTasks.getClassroom,
  leaveClassroom: classroomTasks.leaveClassroom,

  // Post tasks
  listPosts: postTasks.listPosts,
  createSimplePost: postTasks.createSimplePost,
  createPostWithAttachment: postTasks.createPostWithAttachment,
  createAssignment: postTasks.createAssignment,
  getPost: postTasks.getPost,

  // Upload tasks
  uploadFile: uploadTasks.uploadFile,
  downloadFile: uploadTasks.downloadFile,
  uploadAndDelete: uploadTasks.uploadAndDelete,
  batchUpload: uploadTasks.batchUpload,

  // Attendance tasks
  markAttendance: attendanceTasks.markAttendance,
  listAttendance: attendanceTasks.listAttendance,
};

/**
 * Get a subset of tasks by names
 *
 * @param {Array<string>} taskNames - Array of task names to include
 * @returns {Object} - Filtered task registry
 */
export function getTasksByName(taskNames) {
  const filtered = {};
  for (const name of taskNames) {
    if (allTasks[name]) {
      filtered[name] = allTasks[name];
    }
  }
  return filtered;
}

/**
 * Teacher-only tasks (require instructor role)
 */
export const teacherTasks = getTasksByName([
  'createClassroom',
  'createSimplePost',
  'createPostWithAttachment',
  'createAssignment',
  'uploadFile',
  'uploadAndDelete',
  'batchUpload',
  'markAttendance',
]);

/**
 * Student-only tasks (require student role)
 */
export const studentTasks = getTasksByName(['joinClassroom', 'leaveClassroom']);

/**
 * Read-only tasks (any authenticated user)
 */
export const readTasks = getTasksByName([
  'listClassrooms',
  'getClassroom',
  'listPosts',
  'getPost',
  'downloadFile',
  'listAttendance',
]);
