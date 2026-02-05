/**
 * Signup Module
 *
 * Tests admin signup flow which creates organization + admin user
 */

import { check, group, sleep } from 'k6';
import { AuthHelper } from '../../lib/auth.js';
import { generateUniqueData } from '../../lib/data-loader.js';
import { signupDuration, authSuccess, authFailure } from '../../lib/metrics.js';
import { currentConfig } from '../../config/env.js';

/**
 * Test admin signup with organization creation
 * @param {Object} options - Signup options
 * @returns {Object} Result with auth helper and response
 */
export function testAdminSignup(options = {}) {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const uniqueData = generateUniqueData('admin', __VU, __ITER);

  const signupData = {
    name: options.name || uniqueData.name,
    email: options.email || uniqueData.email,
    password: options.password || 'TestPassword123!',
    organizationName: options.organizationName || `Test Org ${uniqueData.id}`,
  };

  let result = null;

  group('Admin Signup', () => {
    const startTime = Date.now();

    const res = auth.signupAdmin(signupData);
    const duration = Date.now() - startTime;

    signupDuration.add(duration);

    const success = check(res, {
      'signup returned 2xx': (r) => r.status >= 200 && r.status < 300,
      'response has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user !== undefined;
        } catch (e) {
          return false;
        }
      },
      'session cookie is set': () => auth.getClient().hasSessionCookie(),
    });

    if (success) {
      authSuccess.add(1);
    } else {
      authFailure.add(1);
      console.error(`Signup failed: ${res.status} - ${res.body}`);
    }

    result = {
      success,
      response: res,
      user: auth.getUser(),
      duration,
    };

    sleep(0.1);
  });

  return {
    auth,
    ...result,
  };
}

/**
 * Default export for standalone execution
 */
export default function () {
  const result = testAdminSignup();

  if (!result.success) {
    console.error('Signup test failed');
  }

  sleep(1);
}

// Export for use in other tests
export { testAdminSignup as signup };
