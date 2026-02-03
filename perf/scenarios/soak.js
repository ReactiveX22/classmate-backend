/**
 * Soak Test Scenario
 *
 * Extended duration test to find memory leaks and degradation
 * - 30 VUs for 1 hour
 * - Monitors for performance degradation over time
 */

import { check, group, sleep } from 'k6';
import { buildOptions } from '../config/options.js';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import {
  generateUniqueData,
  loadCsv,
  getByVuIndex,
} from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';

export const options = buildOptions({
  scenario: 'soak',
});

// Load existing users for soak test
let existingAdmins = [];
try {
  existingAdmins = loadCsv('soak_admins', '../data/admins.csv');
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
  if (existingAdmins.length > 0) {
    group('Soak Signin', () => {
      const admin = getByVuIndex(existingAdmins, __VU);
      const startTime = Date.now();
      const res = auth.signin(admin.email, admin.password);
      metrics.signinDuration.add(Date.now() - startTime);

      check(res, {
        'signin succeeded': (r) => r.status === 200,
      });
    });
  } else {
    const uniqueData = generateUniqueData('soak', __VU, __ITER);
    group('Soak Signup', () => {
      const startTime = Date.now();
      auth.signupAdmin({
        name: `Soak User ${uniqueData.id}`,
        email: uniqueData.email,
        password: 'SoakTest123!',
        organizationName: `Soak Org ${uniqueData.id}`,
      });
      metrics.signupDuration.add(Date.now() - startTime);
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

    check(sessionRes, {
      'session valid': (r) => r.status === 200,
    });

    sleep(0.5);

    // API calls
    const apiStart = Date.now();
    const res = client.get('/api/v1/teachers');
    metrics.crudReadDuration.add(Date.now() - apiStart);

    check(res, {
      'API responded': (r) => r.status < 500,
    });

    sleep(0.5);
  });

  // Realistic think time for soak test
  sleep(Math.random() * 3 + 2);
}

/**
 * Default export
 */
export default soakTest;
