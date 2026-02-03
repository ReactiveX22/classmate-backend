/**
 * Authentication Helper for k6
 *
 * Handles Better-Auth cookie-based authentication for multiple roles
 */

import { check } from 'k6';
import { createClient } from './http-client.js';
import { currentConfig } from '../config/env.js';

/**
 * Authentication helper class
 */
export class AuthHelper {
  constructor(baseUrl = currentConfig.baseUrl) {
    this.client = createClient(baseUrl);
    this.baseUrl = baseUrl;
    this.authPath = currentConfig.authPrefix || '/api/v1/auth';
    this.currentUser = null;
    this.currentSession = null;
  }

  /**
   * Sign up a new admin with organization
   * @param {Object} data - Signup data
   * @returns {Object} Response object
   */
  signupAdmin(data) {
    const res = this.client.post(
      `${this.authPath}/sign-up/email`,
      {
        name: data.name,
        email: data.email,
        password: data.password,
        organizationName: data.organizationName,
      },
      {
        tags: { endpoint: 'signup' },
      },
    );

    const success = check(res, {
      'signup successful': (r) => r.status === 200 || r.status === 201,
      'session cookie set': () => this.client.hasSessionCookie(),
    });

    if (success && res.status < 400) {
      try {
        const body = JSON.parse(res.body);
        this.currentUser = body.user || body;
      } catch (e) {
        // Response may not be JSON
      }
    }

    return res;
  }

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} Response object
   */
  signin(email, password) {
    const res = this.client.post(
      `${this.authPath}/sign-in/email`,
      {
        email,
        password,
      },
      {
        tags: { endpoint: 'signin' },
      },
    );

    const success = check(res, {
      'signin successful': (r) => r.status === 200,
      'session cookie set': () => this.client.hasSessionCookie(),
    });

    if (success) {
      try {
        const body = JSON.parse(res.body);
        this.currentUser = body.user || body;
        this.currentSession = body.session;
      } catch (e) {
        // Response may not be JSON
      }
    }

    return res;
  }

  /**
   * Sign out current user
   * @returns {Object} Response object
   */
  signout() {
    const res = this.client.post(
      `${this.authPath}/sign-out`,
      {},
      {
        tags: { endpoint: 'signout' },
      },
    );

    check(res, {
      'signout successful': (r) => r.status === 200,
    });

    this.currentUser = null;
    this.currentSession = null;

    return res;
  }

  /**
   * Validate current session
   * @returns {Object} Response object
   */
  validateSession() {
    // Better-Auth uses /get-session
    const res = this.client.get(`${this.authPath}/get-session`, {
      tags: { endpoint: 'session' },
    });

    const success = check(res, {
      'session valid': (r) => r.status === 200,
      'has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          // Standard Better-Auth response: { session: {...}, user: {...} }
          return body.user !== undefined;
        } catch (e) {
          return false;
        }
      },
      'has session data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.session !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (success) {
      try {
        const body = JSON.parse(res.body);
        this.currentUser = body.user;
        this.currentSession = body.session;
      } catch (e) {
        // Response may not be JSON
      }
    }

    return res;
  }

  /**
   * Get the underlying HTTP client
   * @returns {Object} HTTP client
   */
  getClient() {
    return this.client;
  }

  /**
   * Get current user data
   * @returns {Object|null} Current user or null
   */
  getUser() {
    return this.currentUser;
  }

  /**
   * Get current user's organization ID
   * @returns {string|null} Organization ID or null
   */
  getOrganizationId() {
    return this.currentUser?.organizationId || null;
  }

  /**
   * Get current user's role
   * @returns {string|null} User role or null
   */
  getRole() {
    return this.currentUser?.role || null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return this.client.hasSessionCookie() && this.currentUser !== null;
  }
}

/**
 * Create a new auth helper with default config
 * @returns {AuthHelper} Auth helper instance
 */
export function createAuth() {
  return new AuthHelper();
}
