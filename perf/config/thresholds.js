/**
 * Performance Thresholds for ClassMate
 *
 * Local Dev: Relaxed thresholds (slower machine, debug mode)
 * Staging: Moderate thresholds (production-like but smaller)
 * Production: Strict thresholds (SLA requirements)
 */

export const thresholds = {
  local: {
    // HTTP metrics
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'],

    // Auth endpoints (CPU-bound due to bcrypt)
    'http_req_duration{endpoint:signup}': ['p(95)<8000'],
    'http_req_duration{endpoint:signin}': ['p(95)<5000'],
    'http_req_duration{endpoint:session}': ['p(95)<500'],

    // Heavy endpoints
    'http_req_duration{endpoint:grade_stats}': ['p(95)<5000'],
    'http_req_duration{endpoint:classrooms_list}': ['p(95)<2000'],
    'http_req_duration{endpoint:upcoming_posts}': ['p(95)<3000'],

    // Standard CRUD
    'http_req_duration{endpoint:crud}': ['p(95)<1500'],

    // Iteration duration
    iteration_duration: ['p(95)<30000'],
  },

  staging: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'],

    'http_req_duration{endpoint:signup}': ['p(95)<4000'],
    'http_req_duration{endpoint:signin}': ['p(95)<2000'],
    'http_req_duration{endpoint:session}': ['p(95)<200'],

    'http_req_duration{endpoint:grade_stats}': ['p(95)<2500'],
    'http_req_duration{endpoint:classrooms_list}': ['p(95)<1000'],
    'http_req_duration{endpoint:upcoming_posts}': ['p(95)<1500'],

    'http_req_duration{endpoint:crud}': ['p(95)<800'],

    iteration_duration: ['p(95)<15000'],
  },

  production: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],

    'http_req_duration{endpoint:signup}': ['p(95)<2000'],
    'http_req_duration{endpoint:signin}': ['p(95)<1000'],
    'http_req_duration{endpoint:session}': ['p(95)<100'],

    'http_req_duration{endpoint:grade_stats}': ['p(95)<1500'],
    'http_req_duration{endpoint:classrooms_list}': ['p(95)<500'],
    'http_req_duration{endpoint:upcoming_posts}': ['p(95)<800'],

    'http_req_duration{endpoint:crud}': ['p(95)<400'],

    iteration_duration: ['p(95)<8000'],

    // Additional production metrics
    checks: ['rate>0.99'],
  },
};

/**
 * Get thresholds for a specific environment
 * @param {string} env - Environment name (local, staging, production)
 * @returns {Object} Threshold configuration
 */
export function getThresholds(env = 'local') {
  return thresholds[env] || thresholds.local;
}
