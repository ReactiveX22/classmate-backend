/**
 * Session Module
 *
 * Tests session validation and management
 */

import { check, group, sleep } from 'k6';
import { AuthHelper } from '../../lib/auth.js';
import {
  sessionDuration,
  authSuccess,
  authFailure,
} from '../../lib/metrics.js';
import { currentConfig } from '../../config/env.js';

/**
 * Test session validation for an authenticated client
 * @param {AuthHelper} auth - Authenticated auth helper
 * @returns {Object} Result with session validation details
 */
export function testSessionValidation(auth) {
  let result = null;

  group('Session Validation', () => {
    const startTime = Date.now();

    const res = auth.validateSession();
    const duration = Date.now() - startTime;

    sessionDuration.add(duration);

    const success = check(res, {
      'session returned 200': (r) => r.status === 200,
      'has user in session': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user !== undefined && body.user.id !== undefined;
        } catch (e) {
          return false;
        }
      },
      'has session data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.session !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (success) {
      authSuccess.add(1);
    } else {
      authFailure.add(1);
    }

    let sessionData = null;
    try {
      sessionData = JSON.parse(res.body);
    } catch (e) {
      // Failed to parse
    }

    result = {
      success,
      response: res,
      user: sessionData?.user,
      session: sessionData?.session,
      duration,
    };

    sleep(0.1);
  });

  return result;
}

/**
 * Test that unauthenticated session returns appropriate response
 * @returns {Object} Result with validation details
 */
export function testUnauthenticatedSession() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  let result = null;

  group('Unauthenticated Session', () => {
    const res = auth.validateSession();

    const success = check(res, {
      'returns 401 or empty session': (r) => {
        if (r.status === 401) return true;
        try {
          const body = JSON.parse(r.body);
          return body.user === null || body.user === undefined;
        } catch (e) {
          return r.status === 401;
        }
      },
    });

    result = {
      success,
      response: res,
    };

    sleep(0.1);
  });

  return result;
}

/**
 * Test multiple session validations (for caching/performance testing)
 * @param {AuthHelper} auth - Authenticated auth helper
 * @param {number} count - Number of validations to perform
 * @returns {Object} Aggregated results
 */
export function testMultipleSessionValidations(auth, count = 10) {
  const results = [];
  let totalDuration = 0;

  group(`Multiple Session Validations (${count}x)`, () => {
    for (let i = 0; i < count; i++) {
      const startTime = Date.now();
      const res = auth.validateSession();
      const duration = Date.now() - startTime;

      totalDuration += duration;
      sessionDuration.add(duration);

      results.push({
        iteration: i + 1,
        status: res.status,
        duration,
        success: res.status === 200,
      });

      sleep(0.05);
    }
  });

  const successCount = results.filter((r) => r.success).length;

  return {
    totalIterations: count,
    successCount,
    failureCount: count - successCount,
    averageDuration: totalDuration / count,
    results,
  };
}

/**
 * Default export for standalone execution
 */
export default function () {
  // Test unauthenticated session
  const unauth = testUnauthenticatedSession();
  console.log(
    `Unauthenticated session test: ${unauth.success ? 'PASS' : 'FAIL'}`,
  );

  sleep(1);
}

// Named exports
export {
  testSessionValidation,
  testUnauthenticatedSession,
  testMultipleSessionValidations,
};
