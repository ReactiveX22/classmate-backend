/**
 * Database Cleaner for k6 Performance Tests
 *
 * Provides SQL generation for cleaning test data while respecting
 * foreign key constraints based on the Drizzle schema.
 *
 * Deletion Order (based on FK analysis):
 * 1. assignment_submission (depends on: classroom_post, user)
 * 2. attendance (depends on: classroom, user)
 * 3. classroom_post (depends on: classroom, user)
 * 4. classroom_members (depends on: classroom, user)
 * 5. classroom (depends on: course, user)
 * 6. enrollment (depends on: student, course)
 * 7. course (depends on: organization, teacher)
 * 8. student (depends on: user)
 * 9. teacher (depends on: user)
 * 10. user_profile (depends on: user)
 * 11. verification (no deps)
 * 12. account (depends on: user)
 * 13. session (depends on: user)
 * 14. user (depends on: organization)
 * 15. organization (no deps)
 */

/**
 * Generate SQL for cleaning test data by email pattern
 * @param {string} emailPattern - SQL LIKE pattern for emails (e.g., '%@test.local')
 * @returns {string} SQL script
 */
export function getCleanupSQL(emailPattern = '%@test.local') {
  return `
-- ========================================
-- ClassMate Performance Test Cleanup Script
-- ========================================
-- Pattern: ${emailPattern}
-- Run in this exact order to respect foreign keys
-- ========================================

BEGIN;

-- 1. Assignment Submissions (depends on classroom_post and user)
DELETE FROM assignment_submission 
WHERE student_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 2. Attendance (depends on classroom and user)
DELETE FROM attendance 
WHERE student_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 3. Classroom Posts (depends on classroom and user)
DELETE FROM classroom_post 
WHERE author_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 4. Classroom Members (depends on classroom and user)
DELETE FROM classroom_members 
WHERE student_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 5. Classrooms (depends on course and user via teacher_id)
DELETE FROM classroom 
WHERE teacher_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 6. Enrollments (depends on student and course)
DELETE FROM enrollment 
WHERE student_id IN (
  SELECT id FROM student 
  WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}')
);

-- 7. Courses (depends on organization and teacher)
DELETE FROM course 
WHERE organization_id IN (
  SELECT organization_id FROM "user" 
  WHERE email LIKE '${emailPattern}' 
  AND organization_id IS NOT NULL
);

-- 8. Students (depends on user)
DELETE FROM student 
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 9. Teachers (depends on user)
DELETE FROM teacher 
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 10. User Profiles (depends on user)
DELETE FROM user_profile 
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 11. Verification tokens (no FK deps, but identifier matches email)
DELETE FROM verification 
WHERE identifier LIKE '${emailPattern}';

-- 12. Accounts (depends on user)
DELETE FROM account 
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 13. Sessions (depends on user)
DELETE FROM session 
WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '${emailPattern}');

-- 14. Users (main table, organization FK is SET NULL on delete)
DELETE FROM "user" 
WHERE email LIKE '${emailPattern}';

-- 15. Organizations (clean up empty test orgs)
DELETE FROM organization 
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM "user" 
  WHERE organization_id IS NOT NULL
)
AND (name LIKE 'Test%' OR name LIKE 'Smoke%' OR name LIKE 'Load%' 
     OR name LIKE 'Stress%' OR name LIKE 'Soak%' OR name LIKE 'Workflow%');

COMMIT;

-- Verification: Check remaining test data
SELECT 'Remaining test users:' AS check, COUNT(*) AS count 
FROM "user" WHERE email LIKE '${emailPattern}';
`;
}

/**
 * Generate SQL for quick cleanup (truncate approach - DANGEROUS)
 * Use only in isolated test environments
 * @returns {string} SQL script
 */
export function getQuickCleanupSQL() {
  return `
-- ========================================
-- QUICK CLEANUP (TRUNCATE) - DANGEROUS!
-- Only use in isolated test environments
-- ========================================

BEGIN;

TRUNCATE TABLE assignment_submission CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE classroom_post CASCADE;
TRUNCATE TABLE classroom_members CASCADE;
TRUNCATE TABLE classroom CASCADE;
TRUNCATE TABLE enrollment CASCADE;
TRUNCATE TABLE course CASCADE;
TRUNCATE TABLE student CASCADE;
TRUNCATE TABLE teacher CASCADE;
TRUNCATE TABLE user_profile CASCADE;
TRUNCATE TABLE verification CASCADE;
TRUNCATE TABLE account CASCADE;
TRUNCATE TABLE session CASCADE;
TRUNCATE TABLE "user" CASCADE;
TRUNCATE TABLE organization CASCADE;

COMMIT;
`;
}

/**
 * Get cleanup patterns for common test scenarios
 */
export const cleanupPatterns = {
  smoke: '%smoke%@test.local',
  load: '%load%@test.local',
  stress: '%stress%@test.local',
  spike: '%spike%@test.local',
  soak: '%soak%@test.local',
  workflow: '%onboard%@test.local',
  allTests: '%@test.local',
};

/**
 * Print cleanup SQL to console (for k6 setup/teardown)
 * @param {string} pattern - Cleanup pattern name or custom pattern
 */
export function printCleanupSQL(pattern = 'allTests') {
  const emailPattern = cleanupPatterns[pattern] || pattern;
  console.log('='.repeat(50));
  console.log('DATABASE CLEANUP SQL');
  console.log('='.repeat(50));
  console.log(getCleanupSQL(emailPattern));
  console.log('='.repeat(50));
}

/**
 * Setup function - prints cleanup SQL at test start
 */
export function setup() {
  console.log('\n📋 Pre-test cleanup SQL (run manually if needed):');
  printCleanupSQL('allTests');
  return { cleanupPattern: '%@test.local' };
}

/**
 * Teardown function - prints cleanup SQL at test end
 * @param {Object} data - Data from setup
 */
export function teardown(data) {
  console.log('\n🧹 Post-test cleanup SQL:');
  printCleanupSQL(data.cleanupPattern || 'allTests');
}

/**
 * Default export for standalone execution
 */
export default function () {
  console.log('Run this script to see cleanup SQL:');
  console.log('  k6 run utils/cleaner.js');
  printCleanupSQL('allTests');
}
