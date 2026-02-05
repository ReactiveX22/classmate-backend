/**
 * ClassMate k6 Performance Test Suite
 *
 * Main entry point for running performance tests.
 *
 * Usage:
 *   k6 run perf/main.js                          # Default smoke test
 *   k6 run perf/main.js --env SCENARIO=load      # Load test
 *   k6 run perf/main.js --env SCENARIO=stress    # Stress test
 *   k6 run perf/main.js --env SCENARIO=spike     # Spike test
 *   k6 run perf/main.js --env SCENARIO=soak      # Soak test (1h)
 *   k6 run perf/main.js --env ENV=staging        # Use staging thresholds
 *
 * Run specific scenarios directly:
 *   k6 run perf/scenarios/smoke.js
 *   k6 run perf/scenarios/load.js
 *   k6 run perf/workflows/full-onboarding.js
 */

import { currentConfig, currentEnv } from './config/env.js';
import { getScenario } from './config/options.js';
import { getThresholds } from './config/thresholds.js';

// Import scenarios
import { loadTest } from './scenarios/load.js';
import { smokeTest } from './scenarios/smoke.js';
import { soakTest } from './scenarios/soak.js';
import { spikeTest } from './scenarios/spike.js';
import { stressTest } from './scenarios/stress.js';

// Import workflows
import { fullOnboardingWorkflow } from './workflows/full-onboarding.js';

// Configuration from environment
const SCENARIO = __ENV.SCENARIO || 'smoke';
const ENV = __ENV.ENV || currentEnv;

// Map scenario names to functions
const scenarioMap = {
  smoke: smokeTest,
  load: loadTest,
  stress: stressTest,
  spike: spikeTest,
  soak: soakTest,
  onboarding: fullOnboardingWorkflow,
};

// Build options dynamically
export const options = {
  scenarios: {
    default: getScenario(SCENARIO),
  },
  thresholds: getThresholds(ENV, SCENARIO),
};

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('═'.repeat(50));
  console.log('ClassMate Performance Test Suite');
  console.log('═'.repeat(50));
  console.log(`Scenario: ${SCENARIO}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Base URL: ${currentConfig.baseUrl}`);
  console.log('═'.repeat(50));

  return {
    scenario: SCENARIO,
    env: ENV,
    baseUrl: currentConfig.baseUrl,
    startTime: new Date().toISOString(),
  };
}

/**
 * Default test function
 */
export default function (data) {
  const testFn = scenarioMap[SCENARIO];

  if (!testFn) {
    console.error(`Unknown scenario: ${SCENARIO}`);
    console.log('Available scenarios:', Object.keys(scenarioMap).join(', '));
    return;
  }

  testFn();
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('═'.repeat(50));
  console.log('Test Complete');
  console.log('═'.repeat(50));
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));
}

// Named exports for direct imports
export {
  fullOnboardingWorkflow,
  loadTest,
  smokeTest,
  soakTest,
  spikeTest,
  stressTest,
};

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data) {
  const jsonFile = `perf/results/${SCENARIO}_summary.json`;
  const jsonContent = JSON.stringify(data);

  const shouldExportHtml = __ENV.HTML === 'true';
  const htmlFile = `perf/results/${SCENARIO}_report.html`;

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [jsonFile]: jsonContent,
    ...(shouldExportHtml ? { [htmlFile]: htmlReport(data) } : {}),
  };
}
