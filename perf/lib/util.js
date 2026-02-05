/**
 * Performance Test Utilities
 *
 * Helper functions for common patterns like error tracking.
 */

import { Counter } from 'k6/metrics';

// Global error counter
const errorCounter = new Counter('errors_total');

/**
 * Track an error response with detailed metrics
 *
 * @param {Object} res - The k6 response object
 * @param {Object} context - Additional context (tags, etc.)
 */
export function trackError(res, context = {}) {
  // Only track actual errors (4xx, 5xx)
  if (res.status >= 400) {
    let errorCode = 'UNKNOWN';

    // Try to extract readable error code from body
    if (res.body) {
      try {
        const body = JSON.parse(res.body);
        if (body.code) errorCode = body.code;
        else if (body.errorCode) errorCode = body.errorCode;
        else if (body.message)
          errorCode = 'MESSAGE_ONLY'; // Message is variable, don't use as tag
        else if (body.error)
          errorCode = body.error.replace(/\s+/g, '_').toUpperCase();
        else if (body.statusCode) errorCode = `HTTP_${body.statusCode}`;
      } catch (e) {
        // Body wasn't JSON
      }
    }

    // Fallback to HTTP status if no code found
    if (errorCode === 'UNKNOWN') {
      errorCode = `HTTP_${res.status}`;
    }

    const tags = Object.assign(
      {
        code: errorCode,
        status: String(res.status),
        // Includes scenario tags if present
        ...context.tags,
      },
      context.tags || {},
    );

    errorCounter.add(1, tags);

    // Optional debug log for 500s or specific codes
    if (res.status >= 500) {
      console.error(`[Error] ${errorCode}: ${res.status} - ${res.url}`);
    }
  }
}
