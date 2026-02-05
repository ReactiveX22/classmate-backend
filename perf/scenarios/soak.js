/**
 * Soak Test Scenario
 *
 * Extended duration test to find memory leaks and degradation
 * - 30 VUs for 1 hour
 * - Monitors for performance degradation over time
 */

import { check, group, sleep } from 'k6';
import { currentConfig } from '../config/env.js';
import { buildOptions } from '../config/options.js';
import { AuthHelper } from '../lib/auth.js';
import {
  generateUniqueData,
  getByVuIndex,
  loadCsv,
} from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';
import { trackError } from '../lib/util.js';
import { allTasks } from '../tasks/index.js';

export const options = buildOptions({
  scenario: 'soak',
});

// Load existing users for soak test
let existingTeachers = [];
try {
  existingTeachers = loadCsv('soak_teachers', '../data/teachers.csv');
} catch (e) {
  // Will create new users if needed
}

/**
 * Soak test function - extended duration testing
 */
export function soakTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();

  // Prefer existing users for soak test (avoid creating too many)
  if (existingTeachers.length > 0) {
    group('Soak Signin', () => {
      const teacher = getByVuIndex(existingTeachers, __VU);
      const startTime = Date.now();
      const res = auth.signin(teacher.email, teacher.password);
      metrics.signinDuration.add(Date.now() - startTime);

      const success = check(res, {
        'signin succeeded': (r) => r.status === 200,
      });

      if (!success) trackError(res);
    });
  } else {
    const uniqueData = generateUniqueData('soak', __VU, __ITER);
    group('Soak Signup', () => {
      const startTime = Date.now();
      const res = auth.signupAdmin({
        name: `Soak User ${uniqueData.id}`,
        email: uniqueData.email,
        password: 'SoakTest123!',
        organizationName: `Soak Org ${uniqueData.id}`,
      });
      metrics.signupDuration.add(Date.now() - startTime);

      const success = check(res, {
        'signup succeeded': (r) => r.status >= 200 && r.status < 300,
      });

      if (!success) trackError(res, { tags: { phase: 'signup' } });
    });
  }

  if (!auth.isAuthenticated()) {
    sleep(2);
    return;
  }

  // Regular operations
  group('Soak Operations', () => {
    // Session check
    const sessionStart = Date.now();
    const sessionRes = auth.validateSession();
    metrics.sessionDuration.add(Date.now() - sessionStart);

    const success = check(sessionRes, {
      'session valid': (r) => r.status === 200,
    });

    if (!success) trackError(sessionRes);

    sleep(0.5);

    // API calls (using listCourses as instructors allowed)
    allTasks.listCourses(client, context);

    sleep(0.5);
  });

  // Realistic think time for soak test
  sleep(Math.random() * 3 + 2);
}

/**
 * Default export
 */
export default soakTest;
