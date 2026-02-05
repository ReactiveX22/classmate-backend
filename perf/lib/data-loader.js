/**
 * Data Loader Utilities for k6
 *
 * Load test data from CSV/JSON files with SharedArray for memory efficiency
 */

import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

/**
 * Load CSV file into SharedArray (shared across VUs)
 * @param {string} name - Unique name for the shared array
 * @param {string} filePath - Path to CSV file
 * @returns {SharedArray} Shared array of parsed rows
 */
export function loadCsv(name, filePath) {
  return new SharedArray(name, function () {
    const content = open(import.meta.resolve(filePath));
    const parsed = papaparse.parse(content, {
      header: true,
      skipEmptyLines: true,
    });
    return parsed.data;
  });
}

/**
 * Load JSON file into SharedArray
 * @param {string} name - Unique name for the shared array
 * @param {string} filePath - Path to JSON file
 * @returns {SharedArray} Shared array of parsed data
 */
export function loadJson(name, filePath) {
  return new SharedArray(name, function () {
    const content = open(import.meta.resolve(filePath));
    return JSON.parse(content);
  });
}

/**
 * Get item from array by VU index (round-robin distribution)
 * @param {Array} data - Data array
 * @param {number} vuIndex - VU index (__VU)
 * @returns {*} Item from array
 */
export function getByVuIndex(data, vuIndex) {
  return data[(vuIndex - 1) % data.length];
}

/**
 * Get random item from array
 * @param {Array} data - Data array
 * @returns {*} Random item from array
 */
export function getRandom(data) {
  return data[Math.floor(Math.random() * data.length)];
}

/**
 * Get item by iteration index (for sequential access)
 * @param {Array} data - Data array
 * @param {number} iterIndex - Iteration index (__ITER)
 * @returns {*} Item from array
 */
export function getByIterIndex(data, iterIndex) {
  return data[iterIndex % data.length];
}

/**
 * Create a data feeder that provides unique data per VU+iteration
 * @param {Array} data - Data array
 * @returns {Function} Feeder function that returns unique data
 */
export function createFeeder(data) {
  return function (vuId, iteration) {
    const index = ((vuId - 1) * 1000 + iteration) % data.length;
    return data[index];
  };
}

/**
 * Generate unique test data with prefix
 * @param {string} prefix - Prefix for generated values
 * @param {number} vuId - VU ID (__VU)
 * @param {number} iteration - Iteration (__ITER)
 * @returns {Object} Object with unique id, email, name generators
 */
export function generateUniqueData(prefix, vuId, iteration) {
  const timestamp = Date.now();
  const uniqueId = `${prefix}-${vuId}-${iteration}-${timestamp}`;

  return {
    id: uniqueId,
    email: `${uniqueId}@test.local`,
    name: `Test ${prefix} ${vuId}-${iteration}`,
    timestamp,
  };
}
