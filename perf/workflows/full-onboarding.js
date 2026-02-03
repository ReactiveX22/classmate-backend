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

import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { buildOptions } from '../config/options.js';
import { currentConfig } from '../config/env.js';
import { AuthHelper } from '../lib/auth.js';
import { generateUniqueData } from '../lib/data-loader.js';
import * as metrics from '../lib/metrics.js';

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
  const uniqueData = generateUniqueData('onboard', __VU, __ITER);

  let success = true;
  let createdTeacherId = null;
  let createdStudentId = null;

  // ================================================
  // PHASE 1: Admin Signup with Organization
  // ================================================
  group('Phase 1: Admin Signup', () => {
    const stepStart = Date.now();

    const signupRes = auth.signupAdmin({
      name: `Admin ${uniqueData.id}`,
      email: uniqueData.email,
      password: 'Workflow123!',
      organizationName: `Workflow Org ${uniqueData.id}`,
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
  // PHASE 3: Create Teacher
  // ================================================
  group('Phase 3: Create Teacher', () => {
    const stepStart = Date.now();

    const teacherRes = client.post(
      '/api/v1/teachers',
      {
        name: `Teacher ${uniqueData.id}`,
        email: `teacher-${uniqueData.id}@test.local`,
        password: 'Teacher123!',
        title: 'Professor',
        joinDate: new Date().toISOString().split('T')[0],
      },
      {
        tags: { endpoint: 'crud' },
      },
    );

    stepTeacherDuration.add(Date.now() - stepStart);
    metrics.crudCreateDuration.add(Date.now() - stepStart);

    const stepSuccess = check(teacherRes, {
      'teacher created': (r) => r.status === 200 || r.status === 201,
      'teacher has user id': (r) => {
        try {
          const body = JSON.parse(r.body);
          createdTeacherId = body.user?.id || body.id;
          return createdTeacherId !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (!stepSuccess) {
      console.error(
        `[VU ${__VU}] Teacher creation failed: ${teacherRes.status}`,
      );
      success = false;
    }

    sleep(0.3);
  });

  if (!success) {
    workflowFailed.add(1);
    return { success: false, phase: 'create_teacher' };
  }

  // ================================================
  // PHASE 4: Create Student
  // ================================================
  group('Phase 4: Create Student', () => {
    const stepStart = Date.now();

    const studentRes = client.post(
      '/api/v1/students',
      {
        name: `Student ${uniqueData.id}`,
        email: `student-${uniqueData.id}@test.local`,
        password: 'Student123!',
        studentId: `STU-${uniqueData.id}`,
      },
      {
        tags: { endpoint: 'crud' },
      },
    );

    stepStudentDuration.add(Date.now() - stepStart);
    metrics.crudCreateDuration.add(Date.now() - stepStart);

    const stepSuccess = check(studentRes, {
      'student created': (r) => r.status === 200 || r.status === 201,
      'student has id': (r) => {
        try {
          const body = JSON.parse(r.body);
          createdStudentId = body.user?.id || body.id;
          return createdStudentId !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (!stepSuccess) {
      console.error(
        `[VU ${__VU}] Student creation failed: ${studentRes.status}`,
      );
      success = false;
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
    adminEmail: uniqueData.email,
  };
}

/**
 * Default export
 */
export default fullOnboardingWorkflow;
