/**
 * Performance Thresholds for ClassMate
 * * Organizes thresholds by Environment and Scenario.
 * Structure: Global (Rate) -> Common (Defaults) -> Scenario (Overrides)
 */

export const thresholds = {
  local: {
    // Global metrics applied to every test in this environment
    global: {
      http_req_failed: ['rate<0.10'], // 10% error tolerance for local dev
    },
    // Common defaults for standard scenarios (smoke, load, etc.)
    common: {
      http_req_duration: ['p(95)<3000', 'p(99)<5000'],
      'http_req_duration{endpoint:signup}': ['p(95)<8000'],
      'http_req_duration{endpoint:signin}': ['p(95)<5000'],
      'http_req_duration{endpoint:session}': ['p(95)<500'],
      'http_req_duration{endpoint:grade_stats}': ['p(95)<5000'],
      'http_req_duration{endpoint:classrooms_list}': ['p(95)<2000'],
      'http_req_duration{endpoint:upcoming_posts}': ['p(95)<3000'],
      'http_req_duration{endpoint:crud}': ['p(95)<1500'],
      iteration_duration: ['p(95)<30000'],
    },
    // Scenario-specific overrides
    onboarding: {
      http_req_duration: ['p(95)<10000', 'p(99)<15000'],
      'http_req_duration{endpoint:classrooms_list}': ['p(95)<5000'],
      'http_req_duration{endpoint:session}': ['p(95)<6000'],
      'http_req_duration{endpoint:crud}': ['p(95)<8000'],
      iteration_duration: ['p(95)<150000'],
    },
  },

  staging: {
    global: {
      http_req_failed: ['rate<0.05'],
    },
    common: {
      http_req_duration: ['p(95)<1500', 'p(99)<3000'],
      'http_req_duration{endpoint:signup}': ['p(95)<4000'],
      'http_req_duration{endpoint:signin}': ['p(95)<2000'],
      'http_req_duration{endpoint:session}': ['p(95)<200'],
      'http_req_duration{endpoint:grade_stats}': ['p(95)<2500'],
      'http_req_duration{endpoint:classrooms_list}': ['p(95)<1000'],
      'http_req_duration{endpoint:upcoming_posts}': ['p(95)<1500'],
      'http_req_duration{endpoint:crud}': ['p(95)<800'],
      iteration_duration: ['p(95)<15000'],
    },
    onboarding: {
      'http_req_duration{endpoint:session}': ['p(95)<1000'],
      iteration_duration: ['p(95)<60000'], // 1 minute
    },
  },

  production: {
    global: {
      http_req_failed: ['rate<0.01'],
      checks: ['rate>0.99'],
    },
    common: {
      http_req_duration: ['p(95)<800', 'p(99)<1500'],
      'http_req_duration{endpoint:signup}': ['p(95)<2000'],
      'http_req_duration{endpoint:signin}': ['p(95)<1000'],
      'http_req_duration{endpoint:session}': ['p(95)<100'],
      'http_req_duration{endpoint:grade_stats}': ['p(95)<1500'],
      'http_req_duration{endpoint:classrooms_list}': ['p(95)<500'],
      'http_req_duration{endpoint:upcoming_posts}': ['p(95)<800'],
      'http_req_duration{endpoint:crud}': ['p(95)<400'],
      iteration_duration: ['p(95)<8000'],
    },
    onboarding: {
      iteration_duration: ['p(95)<30000'], // 30 seconds
    },
  },
};

/**
 * Get merged thresholds for a specific environment and scenario
 * @param {string} env - Environment name (local, staging, production)
 * @param {string} scenario - Scenario name (onboarding, smoke, etc.)
 * @returns {Object} Merged threshold configuration
 */
export function getThresholds(env = 'local', scenario = 'default') {
  const config = thresholds[env] || thresholds.local;

  // Merge Global + Common + Scenario Specific
  return Object.assign(
    {},
    config.global,
    config.common,
    config[scenario] || {},
  );
}
