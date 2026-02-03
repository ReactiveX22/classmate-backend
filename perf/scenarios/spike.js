/**
 * Spike Test Scenario
 *
 * Sudden burst of traffic to test system response to spikes.
 * Uses seeded data from onboarding workflow.
 *
 * - Quick ramp to 100 VUs in 10 seconds
 * - Hold for 1 minute, then drop
 * - Mostly read operations with minimal writes
 */

import { check, group, sleep } from 'k6';
import { currentConfig } from '../config/env.js';
import { buildOptions } from '../config/options.js';
import { AuthHelper } from '../lib/auth.js';
import { getRandom, loadCsv } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';
import { selectTask, weights } from '../lib/task-selector.js';
import { allTasks } from '../tasks/index.js';

export const options = buildOptions({
  scenario: 'spike',
  extraThresholds: {
    http_req_duration: ['p(95)<8000'],
    http_req_failed: ['rate<0.25'],
  },
});

// Load seeded users
const admins = loadCsv('spike_admins', '../data/admins.csv').slice(0, 50);

/**
 * Spike test function - simulates sudden traffic burst
 */
export function spikeTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();

  // Authentication with existing users
  group('Spike Authentication', () => {
    const admin = getRandom(admins);
    const startTime = Date.now();

    // Always use existing users (signin is much lighter than signup)
    auth.signin(admin.email, admin.password);
    metrics.signinDuration.add(Date.now() - startTime);

    check(auth.isAuthenticated(), {
      authenticated: (isAuth) => isAuth === true,
    });
  });

  if (!auth.isAuthenticated()) {
    return;
  }

  // Build minimal context for spike tests
  const context = {
    uniqueId: `spike-${__VU}-${__ITER}`,
  };

  // Execute 2-3 quick weighted tasks
  group('Spike Tasks', () => {
    const taskCount = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < taskCount; i++) {
      const selectedTaskName = selectTask(weights.spike);

      // Strict skip logic for dependent tasks during spike
      // If we don't have the context, we simply skip and do a basic read instead
      if (
        selectedTaskName === 'createClassroom' ||
        selectedTaskName === 'createSimplePost' ||
        selectedTaskName === 'createPostWithAttachment' ||
        selectedTaskName === 'uploadFile' ||
        selectedTaskName === 'markAttendance' ||
        selectedTaskName === 'listPosts' || // Requires classroomId
        selectedTaskName === 'downloadFile' || // Requires classroomId
        selectedTaskName === 'joinClassroom' // Requires classroomCode
      ) {
        // Use simple list operations instead
        const res = client.get('/api/v1/teachers?page=1&limit=5', {
          tags: { endpoint: 'spike_fallback' },
        });
        check(res, { 'spike list ok': (r) => r.status < 500 });
        sleep(0.05);
        continue;
      }

      // Execute the task
      const taskFn = allTasks[selectedTaskName];
      if (typeof taskFn === 'function') {
        try {
          taskFn(client, context);
        } catch (e) {
          // Ignore errors during spike - we're testing resilience
        }
      }

      sleep(0.05);
    }
  });

  // Quick API checks
  group('Spike API Access', () => {
    const startTime = Date.now();
    const res = client.get('/api/v1/teachers', {
      tags: { endpoint: 'spike_teachers' },
    });
    metrics.crudReadDuration.add(Date.now() - startTime);

    check(res, {
      'API responded': (r) => r.status < 500,
    });

    sleep(0.05);

    // Also check courses
    const coursesRes = client.get('/api/v1/courses?page=1&limit=5', {
      tags: { endpoint: 'spike_courses' },
    });

    check(coursesRes, {
      'courses API responded': (r) => r.status < 500,
    });
  });

  // Minimal sleep during spike
  sleep(0.1);
}

/**
 * Default export
 */
export default spikeTest;
