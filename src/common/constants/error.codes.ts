/**
 * Standardized Application Error Codes
 * Used by the AllExceptionsFilter and the frontend for programmatic handling.
 */
export const ERROR_CODES = {
  INFRA: {
    INPUT_VALIDATION: 'INPUT_VALIDATION',
    ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    INPUT_TYPE_MISMATCH: 'INPUT_TYPE_MISMATCH',
  },

  AUTH: {
    ROLE_NOT_ASSIGNED: 'AUTH_ROLE_NOT_ASSIGNED',
    ROLE_PENDING: 'AUTH_ROLE_PENDING',
  },

  COURSE: {
    NOT_FOUND: 'COURSE_NOT_FOUND',
    CAPACITY_FULL: 'COURSE_CAPACITY_FULL',
    ALREADY_ENROLLED: 'COURSE_ALREADY_ENROLLED',
  },
};
