/**
 * Stress Test Scenario
 *
 * Find breaking point by ramping up to high VU counts
 * - Ramps to 200 VUs over 14 minutes
 * - Tests system limits
 */

import { check, group, sleep } from 'k6';
import { buildOptions } from '../config/options.js';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import { generateUniqueData, loadCsv, getRandom } from '../lib/data-loader.js';
import { checkSuccess } from '../lib/assertions.js';
import * as metrics from '../lib/metrics.js';

export const options = buildOptions({
  scenario: 'stress',
  extraThresholds: {
    // Relaxed thresholds for stress testing
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.30'],
  },
});

// Load admins for signin
const admins = loadCsv('stress_admins', '../data/admins.csv');

/**
 * Stress test function - pushes the system to its limits
 */
export function stressTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();
  const uniqueData = generateUniqueData('stress', __VU, __ITER);

  // Track active users
  metrics.activeUsers.add(__VU);

  // 1. Signin (lighter than signup, but we test high volume)
  group('Stress Signin', () => {
    const admin = getRandom(admins);
    const startTime = Date.now();

    // Use random admin from CSV
    auth.signin(admin.email, admin.password);
    metrics.signinDuration.add(Date.now() - startTime);

    const success = check(auth.isAuthenticated(), {
      'signin succeeded': (isAuth) => isAuth === true,
    });

    if (!success) {
      metrics.workflowFailure.add(1);
    }

    sleep(0.2);
  });

  if (!auth.isAuthenticated()) {
    sleep(0.5);
    return;
  }

  // 2. Rapid session checks (tests session lookup performance)
  group('Rapid Session Checks', () => {
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      const res = auth.validateSession();
      metrics.sessionDuration.add(Date.now() - startTime);

      check(res, {
        'session valid': (r) => r.status === 200,
      });

      sleep(0.1);
    }
  });

  // 3. API bombardment
  group('API Stress', () => {
    // Multiple rapid requests
    const endpoints = [
      '/api/v1/teachers',
      '/api/v1/students',
      '/api/v1/teachers?page=1&limit=5',
      '/api/v1/students?page=1&limit=5',
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const res = client.get(endpoint, {
        tags: { endpoint: 'crud' },
      });
      metrics.crudReadDuration.add(Date.now() - startTime);

      check(res, {
        'endpoint responded': (r) => r.status < 500,
      });

      sleep(0.05);
    }
  });

  // 4. Create operations (if still authenticated)
  if (auth.isAuthenticated()) {
    group('Create Operations', () => {
      // Try to create a teacher
      const startTime = Date.now();
      const teacherData = {
        name: `Teacher ${uniqueData.id}`,
        email: `teacher-${uniqueData.id}@test.local`,
        password: 'Teacher123!',
        title: 'Professor',
      };

      const res = client.post('/api/v1/teachers', teacherData, {
        tags: { endpoint: 'crud' },
      });
      metrics.crudCreateDuration.add(Date.now() - startTime);

      check(res, {
        'teacher created or conflict': (r) => r.status < 500,
      });

      sleep(0.1);
    });
  }

  // Minimal think time under stress
  sleep(0.2);
}

/**
 * Default export
 */
export default stressTest;
