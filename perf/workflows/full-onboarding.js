/**
 * Full Onboarding Workflow
 *
 * Complete multi-step workflow testing the entire user onboarding flow:
 * 1. Admin Signup (creates organization)
 * 2. Session Validation
 * 3. Create Teacher
 * 4. Create Student
 * 5. Verify Created Data
 */

import exec from 'k6/execution';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { buildOptions } from '../config/options.js';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import { loadCsv, getByVuIndex } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';

// Load data files
const admins = loadCsv('onboarding_admins', '../data/admins.csv');
const teachers = loadCsv('onboarding_teachers', '../data/teachers.csv');
const students = loadCsv('onboarding_students', '../data/students.csv');

// Calculate ratios
const teachersPerAdmin = Math.floor(teachers.length / admins.length);
const studentsPerAdmin = Math.floor(students.length / admins.length);

// Workflow-specific metrics
const workflowTotalDuration = new Trend(
  'workflow_onboarding_total_duration',
  true,
);
const stepSignupDuration = new Trend('workflow_step_signup_duration', true);
const stepTeacherDuration = new Trend('workflow_step_teacher_duration', true);
const stepStudentDuration = new Trend('workflow_step_student_duration', true);
const workflowComplete = new Counter('workflow_onboarding_complete');
const workflowFailed = new Counter('workflow_onboarding_failed');

export const options = buildOptions({
  scenario: 'workflow',
  extraThresholds: {
    workflow_onboarding_total_duration: ['p(95)<30000'],
    workflow_step_signup_duration: ['p(95)<8000'],
    workflow_step_teacher_duration: ['p(95)<5000'],
    workflow_step_student_duration: ['p(95)<5000'],
  },
});

/**
 * Full onboarding workflow
 */
export function fullOnboardingWorkflow() {
  const workflowStart = Date.now();
  const auth = new AuthHelper(currentConfig.baseUrl);
  const client = auth.getClient();

  // Use global iteration index prevents collisions in shared-iterations
  const iterIndex = exec.scenario.iterationInTest;

  // Get Admin (1 per iteration)
  const adminData = admins[iterIndex % admins.length];

  let success = true;
  let createdTeacherId = null;
  let createdStudentId = null;

  // ================================================
  // PHASE 1: Admin Signup with Organization
  // ================================================
  group('Phase 1: Admin Signup', () => {
    const stepStart = Date.now();

    const signupRes = auth.signupAdmin({
      name: adminData.name,
      email: adminData.email,
      password: adminData.password,
      organizationName: adminData.organizationName,
    });

    stepSignupDuration.add(Date.now() - stepStart);
    metrics.signupDuration.add(Date.now() - stepStart);

    const stepSuccess = check(signupRes, {
      'signup returned success': (r) => r.status >= 200 && r.status < 300,
      'user has admin role': () => auth.getRole() === 'admin',
      'session cookie set': () => client.hasSessionCookie(),
    });

    if (!stepSuccess) {
      console.error(`[VU ${__VU}] Signup failed: ${signupRes.status}`);
      success = false;
    }

    sleep(0.5);
  });

  if (!success || !auth.isAuthenticated()) {
    workflowFailed.add(1);
    return { success: false, phase: 'signup' };
  }

  // ================================================
  // PHASE 2: Validate Session
  // ================================================
  group('Phase 2: Validate Session', () => {
    const stepStart = Date.now();
    const sessionRes = auth.validateSession();
    metrics.sessionDuration.add(Date.now() - stepStart);

    const stepSuccess = check(sessionRes, {
      'session is valid': (r) => r.status === 200,
      'session has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.id;
        } catch (e) {
          return false;
        }
      },
      'session has organization': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.organizationId;
        } catch (e) {
          return false;
        }
      },
    });

    if (!stepSuccess) {
      success = false;
    }

    sleep(0.3);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'session' };
  }

  // ================================================
  // PHASE 3: Create Teachers (Loop)
  // ================================================
  group(`Phase 3: Create Teachers (${teachersPerAdmin}x)`, () => {
    for (let i = 0; i < teachersPerAdmin; i++) {
      const globalTeacherIndex = iterIndex * teachersPerAdmin + i;
      const teacherData = teachers[globalTeacherIndex % teachers.length];

      const stepStart = Date.now();

      const teacherRes = client.post(
        '/api/v1/teachers',
        {
          name: teacherData.name,
          email: teacherData.email,
          password: teacherData.password,
          title: teacherData.title || 'Lecturer',
          joinDate:
            teacherData.joinDate || new Date().toISOString().split('T')[0],
        },
        {
          tags: { endpoint: 'crud' },
        },
      );

      stepTeacherDuration.add(Date.now() - stepStart);
      metrics.crudCreateDuration.add(Date.now() - stepStart);

      const stepSuccess = check(teacherRes, {
        'teacher created': (r) => r.status === 200 || r.status === 201,
      });

      if (!stepSuccess) {
        console.error(
          `[Iter ${iterIndex}] Teacher creation failed for index ${globalTeacherIndex}: ${teacherRes.status}`,
        );
        success = false;
      }
    }
    sleep(0.3);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'create_teacher' };
  }

  // ================================================
  // PHASE 4: Create Students (Loop)
  // ================================================
  group(`Phase 4: Create Students (${studentsPerAdmin}x)`, () => {
    for (let i = 0; i < studentsPerAdmin; i++) {
      const globalStudentIndex = iterIndex * studentsPerAdmin + i;
      const studentData = students[globalStudentIndex % students.length];

      const stepStart = Date.now();

      const studentRes = client.post(
        '/api/v1/students',
        {
          name: studentData.name,
          email: studentData.email,
          password: studentData.password,
          studentId:
            studentData.studentId || `STU-${Date.now()}-${globalStudentIndex}`,
        },
        {
          tags: { endpoint: 'crud' },
        },
      );

      stepStudentDuration.add(Date.now() - stepStart);
      metrics.crudCreateDuration.add(Date.now() - stepStart);

      const stepSuccess = check(studentRes, {
        'student created': (r) => r.status === 200 || r.status === 201,
      });

      if (!stepSuccess) {
        console.error(
          `[Iter ${iterIndex}] Student creation failed for index ${globalStudentIndex}: ${studentRes.status}`,
        );
        success = false;
      }
    }
    sleep(0.3);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'create_student' };
  }

  // ================================================
  // PHASE 5: Verify Created Data
  // ================================================
  group('Phase 5: Verify Data', () => {
    // List teachers
    const teachersRes = client.get('/api/v1/teachers', {
      tags: { endpoint: 'classrooms_list' },
    });

    check(teachersRes, {
      'teachers list accessible': (r) => r.status === 200,
    });

    sleep(0.2);

    // List students
    const studentsRes = client.get('/api/v1/students', {
      tags: { endpoint: 'classrooms_list' },
    });

    const verified = check(studentsRes, {
      'students list accessible': (r) => r.status === 200,
    });

    if (!verified) {
      success = false;
    }

    sleep(0.2);
  });

  // ================================================
  // WORKFLOW COMPLETE
  // ================================================
  const totalDuration = Date.now() - workflowStart;
  workflowTotalDuration.add(totalDuration);
  metrics.workflowDuration.add(totalDuration);

  if (success) {
    workflowComplete.add(1);
    metrics.workflowSuccess.add(1);
  } else {
    workflowFailed.add(1);
    metrics.workflowFailure.add(1);
  }

  return {
    success,
    duration: totalDuration,
    createdTeacherId,
    createdStudentId,
    adminEmail: adminData.email,
  };
}

/**
 * Default export
 */
export default fullOnboardingWorkflow;
