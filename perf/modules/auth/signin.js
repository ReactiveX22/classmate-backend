/**
 * Signin Module
 *
 * Tests signin flow for all user roles (admin, teacher, student)
 */

import { check, group, sleep } from 'k6';
import { AuthHelper } from '../../lib/auth.js';
import { loadCsv, getByVuIndex, getRandom } from '../../lib/data-loader.js';
import { signinDuration, authSuccess, authFailure } from '../../lib/metrics.js';
import { currentConfig } from '../../config/env.js';

// Preload test user data (if files exist)
let admins = [];
let teachers = [];
let students = [];

try {
  admins = loadCsv('admins', '../data/admins.csv');
} catch (e) {
  // File may not exist, will use generated data
}

try {
  teachers = loadCsv('teachers', '../data/teachers.csv');
} catch (e) {
  // File may not exist
}

try {
  students = loadCsv('students', '../data/students.csv');
} catch (e) {
  // File may not exist
}

/**
 * Test signin for a specific user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} role - User role for logging
 * @returns {Object} Result with auth helper and response
 */
export function testSignin(email, password, role = 'user') {
  const auth = new AuthHelper(currentConfig.baseUrl);
  let result = null;

  group(`Signin (${role})`, () => {
    const startTime = Date.now();

    const res = auth.signin(email, password);
    const duration = Date.now() - startTime;

    if (res.status !== 200) {
      console.error(
        `Signin failed for ${email}. Status: ${res.status}. Error: ${res.body}`,
      );
    }

    signinDuration.add(duration);

    const success = check(res, {
      'signin returned 200': (r) => r.status === 200,
      'has user in response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user !== undefined;
        } catch (e) {
          return false;
        }
      },
      'session cookie is set': () => auth.getClient().hasSessionCookie(),
    });

    if (success) {
      authSuccess.add(1);
    } else {
      authFailure.add(1);
      if (currentConfig.debug) {
        console.error(
          `Signin failed for ${email}: ${res.status} - ${res.body}`,
        );
      }
    }

    result = {
      success,
      response: res,
      user: auth.getUser(),
      role: auth.getRole(),
      duration,
    };

    sleep(0.1);
  });

  return {
    auth,
    ...result,
  };
}

/**
 * Test signin with admin credentials
 * @param {Object} options - Options for selecting admin
 * @returns {Object} Signin result
 */
export function signinAdmin(options = {}) {
  let admin;

  if (options.email && options.password) {
    admin = { email: options.email, password: options.password };
  } else if (admins.length > 0) {
    admin = options.random ? getRandom(admins) : getByVuIndex(admins, __VU);
  } else {
    throw new Error(
      'No admin credentials available. Provide email/password or load admins.csv',
    );
  }

  return testSignin(admin.email, admin.password, 'admin');
}

/**
 * Test signin with teacher credentials
 * @param {Object} options - Options for selecting teacher
 * @returns {Object} Signin result
 */
export function signinTeacher(options = {}) {
  let teacher;

  if (options.email && options.password) {
    teacher = { email: options.email, password: options.password };
  } else if (teachers.length > 0) {
    teacher = options.random
      ? getRandom(teachers)
      : getByVuIndex(teachers, __VU);
  } else {
    throw new Error(
      'No teacher credentials available. Provide email/password or load teachers.csv',
    );
  }

  return testSignin(teacher.email, teacher.password, 'teacher');
}

/**
 * Test signin with student credentials
 * @param {Object} options - Options for selecting student
 * @returns {Object} Signin result
 */
export function signinStudent(options = {}) {
  let student;

  if (options.email && options.password) {
    student = { email: options.email, password: options.password };
  } else if (students.length > 0) {
    student = options.random
      ? getRandom(students)
      : getByVuIndex(students, __VU);
  } else {
    throw new Error(
      'No student credentials available. Provide email/password or load students.csv',
    );
  }

  return testSignin(student.email, student.password, 'student');
}

/**
 * Default export for standalone execution
 */
export default function () {
  // Try to signin with first available user type
  if (admins.length > 0) {
    const result = signinAdmin({ random: true });
    console.log(`Admin signin: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  } else {
    console.warn('No test users available. Run signup tests first.');
  }

  sleep(1);
}

// Named exports
export { testSignin, signinAdmin, signinTeacher, signinStudent };
