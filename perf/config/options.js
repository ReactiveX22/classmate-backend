/**
 * K6 Options Factory
 *
 * Provides pre-configured options for different test scenarios
 */

import { getThresholds } from './thresholds.js';
import { currentEnv } from './env.js';

/**
 * Scenario configurations
 */
export const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  },

  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 0 },
    ],
  },

  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '10s', target: 0 },
    ],
  },

  soak: {
    executor: 'constant-vus',
    vus: 30,
    duration: '1h',
  },

  onboarding: {
    executor: 'shared-iterations',
    vus: 30,
    iterations: 100,
    maxDuration: '10m',
  },

  // Per-VU iterations (useful for workflows)
  workflow: {
    executor: 'per-vu-iterations',
    vus: 5,
    iterations: 1,
    maxDuration: '5m',
  },
};

/**
 * Get scenario configuration by name
 * @param {string} name - Scenario name
 * @returns {Object} Scenario configuration
 */
export function getScenario(name = 'smoke') {
  return scenarios[name] || scenarios.smoke;
}

/**
 * Build complete k6 options object
 * @param {Object} params - Configuration parameters
 * @param {string} params.scenario - Scenario name
 * @param {string} params.env - Environment name
 * @param {Object} params.extraThresholds - Additional thresholds to merge
 * @returns {Object} Complete k6 options
 */
export function buildOptions({
  scenario = 'smoke',
  env = currentEnv,
  extraThresholds = {},
} = {}) {
  return {
    scenarios: {
      default: getScenario(scenario),
    },
    thresholds: {
      ...getThresholds(env),
      ...extraThresholds,
    },
  };
}
