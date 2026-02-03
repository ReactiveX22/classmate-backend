/**
 * HTTP Client Wrapper for k6
 *
 * Provides a consistent API with automatic cookie jar management
 * for Better-Auth session handling.
 */

import http from 'k6/http';
import { Trend, Counter } from 'k6/metrics';
import { currentConfig } from '../config/env.js';

// Custom metrics
const httpDuration = new Trend('http_req_custom_duration');
const httpErrors = new Counter('http_req_custom_errors');

/**
 * Create an HTTP client with persistent cookie jar
 * @param {string} baseUrl - Base URL for requests
 * @returns {Object} HTTP client with get, post, patch, delete methods
 */
export function createClient(
  baseUrl = currentConfig.baseUrl,
  origin = currentConfig.origin,
) {
  const jar = http.cookieJar();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Origin: origin,
  };

  /**
   * Make a GET request
   */
  function get(path, params = {}) {
    const url = `${baseUrl}${path}`;
    const res = http.get(url, {
      jar,
      headers: { ...defaultHeaders, ...params.headers },
      tags: params.tags || {},
      ...params,
    });

    trackMetrics(res, params.tags);
    return res;
  }

  /**
   * Make a POST request
   */
  function post(path, body = {}, params = {}) {
    const url = `${baseUrl}${path}`;
    const payload = typeof body === 'string' ? body : JSON.stringify(body);

    const res = http.post(url, payload, {
      jar,
      headers: { ...defaultHeaders, ...params.headers },
      tags: params.tags || {},
      ...params,
    });

    trackMetrics(res, params.tags);
    return res;
  }

  /**
   * Make a PATCH request
   */
  function patch(path, body = {}, params = {}) {
    const url = `${baseUrl}${path}`;
    const payload = typeof body === 'string' ? body : JSON.stringify(body);

    const res = http.patch(url, payload, {
      jar,
      headers: { ...defaultHeaders, ...params.headers },
      tags: params.tags || {},
      ...params,
    });

    trackMetrics(res, params.tags);
    return res;
  }

  /**
   * Make a DELETE request
   */
  function del(path, params = {}) {
    const url = `${baseUrl}${path}`;
    const res = http.del(url, null, {
      jar,
      headers: { ...defaultHeaders, ...params.headers },
      tags: params.tags || {},
      ...params,
    });

    trackMetrics(res, params.tags);
    return res;
  }

  /**
   * Track custom metrics for the response
   */
  function trackMetrics(res, tags) {
    httpDuration.add(res.timings.duration, tags);
    if (res.status >= 400) {
      httpErrors.add(1, tags);
    }
  }

  /**
   * Get cookies for the current base URL
   */
  function getCookies() {
    return jar.cookiesForURL(baseUrl);
  }

  /**
   * Check if session cookie exists
   */
  function hasSessionCookie() {
    const cookies = getCookies();
    return !!(
      cookies['better-auth.session_token'] ||
      cookies['better-auth.session'] ||
      cookies['session_token']
    );
  }

  /**
   * Clear all cookies
   */
  function clearCookies() {
    jar.clear(baseUrl);
  }

  return {
    jar,
    baseUrl,
    get,
    post,
    patch,
    delete: del,
    getCookies,
    hasSessionCookie,
    clearCookies,
  };
}

/**
 * Create a client from environment config
 */
export function createEnvClient() {
  return createClient(currentConfig.baseUrl);
}
