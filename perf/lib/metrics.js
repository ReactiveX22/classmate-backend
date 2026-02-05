/**
 * Custom Metrics for k6
 *
 * Defines custom metrics for detailed performance tracking
 */

import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

// ============================================
// Authentication Metrics
// ============================================

export const signupDuration = new Trend('auth_signup_duration', true);
export const signinDuration = new Trend('auth_signin_duration', true);
export const sessionDuration = new Trend('auth_session_duration', true);

export const authSuccess = new Rate('auth_success_rate');
export const authFailure = new Counter('auth_failure_count');

// ============================================
// Workflow Metrics
// ============================================

export const workflowDuration = new Trend('workflow_total_duration', true);
export const workflowSuccess = new Counter('workflow_success_count');
export const workflowFailure = new Counter('workflow_failure_count');

// ============================================
// Endpoint-Specific Metrics
// ============================================

export const classroomListDuration = new Trend('classroom_list_duration', true);
export const classroomCreateDuration = new Trend(
  'classroom_create_duration',
  true,
);
export const gradeStatsDuration = new Trend('grade_stats_duration', true);
export const upcomingPostsDuration = new Trend('upcoming_posts_duration', true);

// ============================================
// CRUD Operation Metrics
// ============================================

export const crudCreateDuration = new Trend('crud_create_duration', true);
export const crudReadDuration = new Trend('crud_read_duration', true);
export const crudUpdateDuration = new Trend('crud_update_duration', true);
export const crudDeleteDuration = new Trend('crud_delete_duration', true);

// ============================================
// General Metrics
// ============================================

export const activeUsers = new Gauge('active_users');
export const requestsPerSecond = new Rate('requests_per_second');

// ============================================
// Helper Functions
// ============================================

/**
 * Track operation duration with custom metric
 * @param {Trend} metric - The trend metric to track
 * @param {Function} operation - Async operation to time
 * @returns {*} Operation result
 */
export function trackDuration(metric, operation) {
  const start = Date.now();
  const result = operation();
  const duration = Date.now() - start;
  metric.add(duration);
  return result;
}

/**
 * Create a timed wrapper for operations
 * @param {Trend} metric - The trend metric to track
 * @returns {Function} Wrapper function
 */
export function createTimer(metric) {
  return function (operation) {
    const start = Date.now();
    const result = operation();
    metric.add(Date.now() - start);
    return result;
  };
}
