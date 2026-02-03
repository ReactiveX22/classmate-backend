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
```

## Test Strategy

### Phase 1: Database Seeding (Onboarding)

Run the onboarding workflow first to seed the database:

```bash
k6 run perf/main.js --env SCENARIO=onboarding
```

This creates:

- 100 Admins with Organizations
- 100 Teachers (1 per admin)
- 100 Students (1 per admin)
- ~200-300 Courses (2-3 per admin, with teacher assignment)

### Phase 2: Load Testing

After seeding, run load/spike/stress tests:

```bash
# Normal load test
k6 run perf/main.js --env SCENARIO=load

# Spike test (sudden traffic burst)
k6 run perf/main.js --env SCENARIO=spike

# Stress test (find breaking point)
k6 run perf/main.js --env SCENARIO=stress
```

## Scenarios

| Scenario       | Command                     | Purpose                                  |
| -------------- | --------------------------- | ---------------------------------------- |
| **Smoke**      | `--env SCENARIO=smoke`      | Quick sanity check (1 VU, 30s)           |
| **Load**       | `--env SCENARIO=load`       | Normal load with weighted tasks (50 VUs) |
| **Stress**     | `--env SCENARIO=stress`     | Find breaking point (200 VUs)            |
| **Spike**      | `--env SCENARIO=spike`      | Sudden traffic burst (100 VUs)           |
| **Soak**       | `--env SCENARIO=soak`       | Memory leak detection (30 VUs, 1h)       |
| **Onboarding** | `--env SCENARIO=onboarding` | Database seeding (run first!)            |

## Weighted Task Selection

Load/Spike/Stress tests use weighted random task selection:

### Load Test Weights (Realistic Usage)

| Task                     | Weight | Description                    |
| ------------------------ | ------ | ------------------------------ |
| listClassrooms           | 25%    | List user's classrooms         |
| listPosts                | 20%    | List classroom posts           |
| downloadFile             | 15%    | Download file attachments      |
| createSimplePost         | 12%    | Create post without attachment |
| createPostWithAttachment | 8%     | Upload file + create post      |
| createClassroom          | 5%     | Create new classroom           |
| joinClassroom            | 5%     | Student joins classroom        |
| uploadFile               | 7%     | Dedicated file upload          |
| markAttendance           | 3%     | Mark student attendance        |

### Stress Test Weights (Heavy Operations)

| Task                     | Weight | Description                    |
| ------------------------ | ------ | ------------------------------ |
| listClassrooms           | 15%    | List user's classrooms         |
| listPosts                | 15%    | List classroom posts           |
| downloadFile             | 10%    | Download file attachments      |
| createSimplePost         | 15%    | Create post without attachment |
| createPostWithAttachment | 10%    | Upload file + create post      |
| createClassroom          | 10%    | Create new classroom           |
| joinClassroom            | 5%     | Student joins classroom        |
| uploadFile               | 15%    | **Heavy upload stress**        |
| markAttendance           | 5%     | Mark student attendance        |

## Folder Structure

```
perf/
├── config/              # Environment, thresholds, options
│   ├── env.js
│   ├── options.js
│   └── thresholds.js
├── data/                # Test data (CSV files)
│   ├── assets/          # Binary files for upload testing
│   │   └── sample.pdf   # Sample PDF for uploads (add manually)
│   ├── admins.csv       # 100 admin users
│   ├── teachers.csv     # 100 teacher users
│   ├── students.csv     # 100 student users
│   ├── courses.csv      # Course templates
│   └── classrooms.csv   # Classroom templates
├── lib/                 # Shared utilities
│   ├── auth.js          # Authentication helper
│   ├── data-loader.js   # CSV loading utilities
│   ├── http-client.js   # HTTP client wrapper
│   ├── metrics.js       # Custom metrics
│   ├── assertions.js    # Check utilities
│   └── task-selector.js # Weighted task selection
├── tasks/               # Reusable task modules
│   ├── index.js         # Task registry
│   ├── classroom.tasks.js
│   ├── post.tasks.js
│   ├── upload.tasks.js
│   └── attendance.tasks.js
├── scenarios/           # Test scenarios
│   ├── smoke.js
│   ├── load.js
│   ├── spike.js
│   ├── stress.js
│   └── soak.js
├── workflows/           # Multi-step workflows
│   └── full-onboarding.js
├── utils/               # Cleanup utilities
│   └── cleaner.js
└── main.js              # Main entry point
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

## File Upload Testing

To test file uploads, add a sample PDF to `perf/data/assets/sample.pdf`:

- Recommended size: 50-100KB
- Format: PDF (matches educational use case)

The upload flow:

1. `POST /classrooms/:id/posts/upload` - Upload file
2. Response contains `{ id, name, url, type, size, mimeType }`
3. `POST /classrooms/:id/posts/` - Create post with attachment array

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
| Upload p(95) | <10s    | <5s     | <3s        |

## Authentication

The test suite handles Better-Auth cookie-based sessions automatically:

1. Each virtual user gets its own cookie jar
2. Session cookies are persisted across requests
3. Multi-role support: Admin, Teacher, Student

## Task Modules

Tasks are organized by domain:

- **classroom.tasks.js**: Create, list, join, leave classrooms
- **post.tasks.js**: Create posts (with/without attachments), assignments
- **upload.tasks.js**: File upload, download, batch upload
- **attendance.tasks.js**: Mark and list attendance

Each task includes:

- Input validation
- Metrics tracking
- Error handling
- Proper k6 checks
