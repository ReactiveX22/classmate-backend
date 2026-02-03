import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// 1. Load your CSV (using SharedArray so it's memory efficient)
const csvData = new SharedArray('admin_users', function () {
  return papaparse.parse(open('./data/admins.csv'), { header: true }).data;
});

export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-arrival-rate',
      rate: 2, // 2 users per second
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'], // The test "fails" if 95% of reqs are > 300ms
  },
};

export default function () {
  // Serial selection using built-in globals:
  // This ensures different VUs pick different starting points in the CSV
  const userIndex = (__ITER * 5 + (__VU - 1)) % csvData.length;
  const user = csvData[userIndex];

  const payload = JSON.stringify({
    name: user.name,
    email: user.email,
    password: user.password,
    organizationName: user.organizationName,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(
    'http://localhost:3000/api/v1/auth/sign-up/email',
    payload,
    params,
  );

  // Success check for 200 or 201
  const isSuccess = res.status === 200 || res.status === 201;

  if (!isSuccess) {
    console.log(`❌ Error ${res.status}: ${res.body}`);
  }

  check(res, {
    'is success': (r) => isSuccess,
  });
}
// 2. This hook runs at the very end to save your local report
export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    'summary.json': JSON.stringify(data),
    stdout: `\n✨ Test complete! View your report at: summary.html\n`,
  };
}
