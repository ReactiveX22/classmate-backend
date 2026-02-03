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

// Try to load existing users for faster signin
let existingAdmins = [];
try {
  existingAdmins = loadCsv('spike_admins', '../data/admins.csv');
} catch (e) {
  // Will create new users
}

/**
 * Spike test function - simulates sudden traffic burst
 */
export function spikeTest() {
  const auth = new AuthHelper(currentConfig.baseUrl);
  const uniqueData = generateUniqueData('spike', __VU, __ITER);

  // Mix of signin (fast) and signup (slow) to simulate real spike
  const useExisting = existingAdmins.length > 0 && Math.random() > 0.3;

  group('Spike Authentication', () => {
    if (useExisting) {
      const admin = getRandom(existingAdmins);
      const startTime = Date.now();
      auth.signin(admin.email, admin.password);
      metrics.signinDuration.add(Date.now() - startTime);
    } else {
      const startTime = Date.now();
      auth.signupAdmin({
        name: `Spike User ${uniqueData.id}`,
        email: uniqueData.email,
        password: 'SpikeTest123!',
        organizationName: `Spike Org ${uniqueData.id}`,
      });
      metrics.signupDuration.add(Date.now() - startTime);
    }
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
