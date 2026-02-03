# ClassMate k6 Performance Test Suite

Professional load testing framework for the ClassMate NestJS backend.

## Quick Start

```bash
# Install k6 (if not installed)
# https://k6.io/docs/getting-started/installation/

# Run smoke test (quick sanity check)
k6 run perf/main.js

# Run with specific scenario
k6 run perf/main.js --env SCENARIO=load
k6 run perf/main.js --env SCENARIO=stress

# Run with environment thresholds
k6 run perf/main.js --env SCENARIO=load --env ENV=staging
```

## Scenarios

| Scenario   | Command                 | Purpose                                      |
| ---------- | ----------------------- | -------------------------------------------- |
| **Smoke**  | `--env SCENARIO=smoke`  | Quick sanity check (1 VU, 30s)               |
| **Load**   | `--env SCENARIO=load`   | Normal load (ramp to 50 VUs, 5m)             |
| **Stress** | `--env SCENARIO=stress` | Find breaking point (Requires seeded users)  |
| **Spike**  | `--env SCENARIO=spike`  | Sudden traffic burst (Requires seeded users) |
| **Soak**   | `--env SCENARIO=soak`   | Memory leak detection (30 VUs, 1h)           |

## Workflows

```bash
# Full onboarding workflow (Seeding)
# Use this to seed the database with users before running spike/stress tests
k6 run perf/main.js --env SCENARIO=onboarding

# Role-specific workflows
k6 run perf/main.js --env SCENARIO=teacher
k6 run perf/main.js --env SCENARIO=student
```

> **Note:** Spike and Stress tests rely on existing users. Run the `onboarding` scenario first to seed the database.

## Folder Structure

```
perf/
├── config/          # Environment, thresholds, options
├── lib/             # HTTP client, auth, assertions, metrics
├── modules/auth/    # Auth test modules (signup, signin, session)
├── scenarios/       # Test scenarios (smoke, load, stress, etc.)
├── workflows/       # Multi-step workflow tests
├── utils/           # Cleaner and seeder utilities
├── data/            # Test data (CSV files)
└── main.js          # Main entry point
```

## Environment Configuration

| Variable   | Default                 | Description                                 |
| ---------- | ----------------------- | ------------------------------------------- |
| `BASE_URL` | `http://localhost:3000` | API base URL                                |
| `ENV`      | `local`                 | Threshold preset (local/staging/production) |
| `SCENARIO` | `smoke`                 | Test scenario to run                        |

```bash
# Example: Run against staging
k6 run perf/main.js \
  --env BASE_URL=https://staging.classmate.com \
  --env ENV=staging \
  --env SCENARIO=load
```

## Database Cleanup

Generate cleanup SQL for test data:

```bash
k6 run perf/utils/cleaner.js
```

Then execute the printed SQL in PostgreSQL to clean test data.

## Thresholds

| Metric       | Local   | Staging | Production |
| ------------ | ------- | ------- | ---------- |
| HTTP p(95)   | <3000ms | <1500ms | <800ms     |
| HTTP p(99)   | <5000ms | <3000ms | <1500ms    |
| Error Rate   | <10%    | <5%     | <1%        |
| Signup p(95) | <8000ms | <4000ms | <2000ms    |
| Signin p(95) | <5000ms | <2000ms | <1000ms    |

## Authentication

The test suite handles Better-Auth cookie-based sessions automatically:

1. Each virtual user gets its own cookie jar
2. Session cookies are persisted across requests
3. Multi-role support: Admin, Teacher, Student

## Test Data

Place CSV files in `perf/data/`:

- `admins.csv` - Admin credentials
- `teachers.csv` - Teacher credentials
- `students.csv` - Student credentials

Format: `name,email,password,organizationName`
