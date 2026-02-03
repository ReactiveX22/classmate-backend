/**
 * Assertion Helpers for k6
 *
 * Common check() wrappers for consistent validation
 */

import { check } from 'k6';

/**
 * Check response status is 2xx
 * @param {Object} res - k6 response object
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkSuccess(res, name = 'request') {
  return check(res, {
    [`${name} succeeded (2xx)`]: (r) => r.status >= 200 && r.status < 300,
  });
}

/**
 * Check response status is exactly as expected
 * @param {Object} res - k6 response object
 * @param {number} expectedStatus - Expected HTTP status
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkStatus(res, expectedStatus, name = 'request') {
  return check(res, {
    [`${name} returned ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}

/**
 * Check response is valid JSON
 * @param {Object} res - k6 response object
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkJson(res, name = 'response') {
  return check(res, {
    [`${name} is valid JSON`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Check response body contains expected field
 * @param {Object} res - k6 response object
 * @param {string} field - Field name to check
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkHasField(res, field, name = 'response') {
  return check(res, {
    [`${name} has '${field}' field`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return body[field] !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Check response time is within threshold
 * @param {Object} res - k6 response object
 * @param {number} maxDuration - Maximum duration in ms
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkDuration(res, maxDuration, name = 'request') {
  return check(res, {
    [`${name} completed within ${maxDuration}ms`]: (r) =>
      r.timings.duration < maxDuration,
  });
}

/**
 * Check paginated response structure
 * @param {Object} res - k6 response object
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkPagination(res, name = 'response') {
  return check(res, {
    [`${name} has pagination data`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.data !== undefined &&
          (body.meta !== undefined || body.pagination !== undefined)
        );
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Check response contains array data
 * @param {Object} res - k6 response object
 * @param {string} field - Array field name (defaults to 'data')
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkArray(res, field = 'data', name = 'response') {
  return check(res, {
    [`${name} has array in '${field}'`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body[field]);
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Combined check for standard API response
 * @param {Object} res - k6 response object
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkApiResponse(res, name = 'API') {
  return checkSuccess(res, name) && checkJson(res, name);
}

/**
 * Combined check for list/paginated API response
 * @param {Object} res - k6 response object
 * @param {string} name - Check name prefix
 * @returns {boolean} Check result
 */
export function checkListResponse(res, name = 'list') {
  return (
    checkSuccess(res, name) &&
    checkJson(res, name) &&
    checkPagination(res, name)
  );
}
