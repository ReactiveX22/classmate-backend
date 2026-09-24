/**
 * Smoke Test Scenario
 *
 * Quick sanity check to verify the system is working
 * - 1 VU, 30 seconds
 * - Tests basic endpoints
 */

import { check, group, sleep } from 'k6';
import { currentConfig } from '../config/env.js';
import { buildOptions } from '../config/options.js';
import { checkSuccess } from '../lib/assertions.js';
import { AuthHelper } from '../lib/auth.js';
import { generateUniqueData } from '../lib/data-loader.js';
import { trackError } from '../lib/util.js';

export const options = buildOptions({
  scenario: 'smoke',
  extraThresholds: {
    http_req_duration: ['p(95)<550'],
    'http_req_duration{endpoint:signin}': ['p(95)<250'],
    http_req_failed: ['rate<0.05'],
  },
});

/**
 * Smoke test function - tests core functionality
 */
export function smokeTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();
  const uniqueData = generateUniqueData('smoke', __VU, __ITER);
  const testEmail = uniqueData.email;
  const testPassword = 'SmokeTest123!';

  // 1. Health Check / Base endpoint
  group('Health Check', () => {
    const res = client.get('/api/v1/health');

    const checkPassed = check(res, {
      'API is reachable': (r) => r.status < 500,
    });

    if (!checkPassed) trackError(res);

    sleep(0.5);
  });

  // 2. Test Signup
  group('Signup Flow', () => {
    const signupRes = auth.signupAdmin({
      name: `Smoke Test ${uniqueData.id}`,
      email: testEmail,
      password: testPassword,
      organizationName: `Smoke Org ${uniqueData.id}`,
    });

    const signupSuccess = check(signupRes, {
      'signup succeeded': (r) => r.status >= 200 && r.status < 300,
    });

    if (!signupSuccess) {
      console.error(`Signup failed: ${signupRes.status}`);
      trackError(signupRes, { tags: { phase: 'signup' } });
      return;
    }

    sleep(0.5);
  });

  // 3. Test Session
  group('Session Validation', () => {
    const sessionRes = auth.validateSession();

    const success = check(sessionRes, {
      'session is valid': (r) => r.status === 200,
      'has user data': (r) => {
        try {
          return JSON.parse(r.body).user !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (!success) trackError(sessionRes);

    sleep(0.5);
  });

  group('Refresh Session', () => {
    const signinRes = auth.signin(testEmail, testPassword);
    sleep(0.3);
  });

  if (auth.isAuthenticated()) {
    group('API Endpoints', () => {
      // List teachers (admin only)
      const teachersRes = client.get('/api/v1/teachers');
      checkSuccess(teachersRes, 'teachers list');

      sleep(0.3);

      // List students (admin only)
      const studentsRes = client.get('/api/v1/students');
      checkSuccess(studentsRes, 'students list');

      sleep(0.3);
    });
  }

  sleep(1);
}

/**
 * Default export
 */
export default smokeTest;
