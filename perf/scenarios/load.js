/**
 * Load Test Scenario
 *
 * Normal load testing to measure typical performance
 * - Ramps from 0 to 50 VUs over 5 minutes
 * - Tests realistic user flows
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
import { checkSuccess } from '../lib/assertions.js';
import * as metrics from '../lib/metrics.js';

export const options = buildOptions({
  scenario: 'load',
});

// Try to load existing test users
let existingAdmins = [];
try {
  existingAdmins = loadCsv('load_admins', '../data/admins.csv');
} catch (e) {
  // Will create new users
}

/**
 * Load test function - simulates normal user behavior
 */
export function loadTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();
  const uniqueData = generateUniqueData('load', __VU, __ITER);

  // Decide: create new user or use existing
  const useExisting = existingAdmins.length > 0 && Math.random() > 0.2;

  if (useExisting) {
    // Use existing user (80% of traffic)
    group('Signin with Existing User', () => {
      const admin = getByVuIndex(existingAdmins, __VU);

      const startTime = Date.now();
      const signinRes = auth.signin(admin.email, admin.password);
      metrics.signinDuration.add(Date.now() - startTime);

      const success = check(signinRes, {
        'signin succeeded': (r) => r.status === 200,
      });

      if (!success) {
        console.error(`Signin failed for ${admin.email}`);
        return;
      }

      sleep(0.5);
    });
  } else {
    // Create new user (20% of traffic)
    group('Create New User', () => {
      const startTime = Date.now();
      const signupRes = auth.signupAdmin({
        name: `Load User ${uniqueData.id}`,
        email: uniqueData.email,
        password: 'LoadTest123!',
        organizationName: `Load Org ${uniqueData.id}`,
      });
      metrics.signupDuration.add(Date.now() - startTime);

      check(signupRes, {
        'signup succeeded': (r) => r.status >= 200 && r.status < 300,
      });

      sleep(0.5);
    });
  }

  // Skip API tests if not authenticated
  if (!auth.isAuthenticated()) {
    sleep(1);
    return;
  }

  // Session validation
  group('Session Check', () => {
    const startTime = Date.now();
    const sessionRes = auth.validateSession();
    metrics.sessionDuration.add(Date.now() - startTime);

    check(sessionRes, {
      'session valid': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // API Operations
  group('API Operations', () => {
    // List teachers
    const startTeachers = Date.now();
    const teachersRes = client.get('/api/v1/teachers', {
      tags: { endpoint: 'classrooms_list' },
    });
    metrics.classroomListDuration.add(Date.now() - startTeachers);
    checkSuccess(teachersRes, 'teachers list');

    sleep(0.3);

    // List students with pagination
    const startStudents = Date.now();
    const studentsRes = client.get('/api/v1/students?page=1&limit=10', {
      tags: { endpoint: 'crud' },
    });
    metrics.crudReadDuration.add(Date.now() - startStudents);
    checkSuccess(studentsRes, 'students list');

    sleep(0.3);
  });

  // Think time
  sleep(Math.random() * 2 + 1);
}

/**
 * Default export
 */
export default loadTest;
