/**
 * Spike Test Scenario
 *
 * Sudden burst of traffic to test system response to spikes
 * - Quick ramp to 100 VUs in 10 seconds
 * - Hold for 1 minute, then drop
 */

import { check, group, sleep } from 'k6';
import { buildOptions } from '../config/options.js';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import { generateUniqueData, loadCsv, getRandom } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';

export const options = buildOptions({
  scenario: 'spike',
  extraThresholds: {
    http_req_duration: ['p(95)<8000'],
    http_req_failed: ['rate<0.25'],
  },
});

const admins = loadCsv('spike_admins', '../data/admins.csv');

/**
 * Spike test function - simulates sudden traffic burst
 */
export function spikeTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);

  group('Spike Authentication', () => {
    const admin = getRandom(admins);
    const startTime = Date.now();

    // Always use existing users (signin is much lighter than signup)
    auth.signin(admin.email, admin.password);
    metrics.signinDuration.add(Date.now() - startTime);
  });

  if (!auth.isAuthenticated()) {
    return;
  }

  // Quick API checks
  group('Spike API Access', () => {
    const client = auth.getClient();

    const startTime = Date.now();
    const res = client.get('/api/v1/teachers');
    metrics.crudReadDuration.add(Date.now() - startTime);

    check(res, {
      'API responded': (r) => r.status < 500,
    });
  });

  // Minimal sleep during spike
  sleep(0.1);
}

/**
 * Default export
 */
export default spikeTest;
