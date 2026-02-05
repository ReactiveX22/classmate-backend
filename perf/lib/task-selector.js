/**
 * Task Selector Library
 *
 * Weighted random selection of tasks for load testing.
 * Implements professional load testing patterns with configurable weights.
 */

/**
 * Weight configurations for different test scenarios
 */
export const weights = {
  // Load test weights - realistic usage patterns
  load: {
    // Read operations (60% total)
    listClassrooms: 25,
    listPosts: 20,
    downloadFile: 15,

    // Write operations (30% total)
    createSimplePost: 12,
    createPostWithAttachment: 8,
    createClassroom: 5,
    joinClassroom: 5,

    // Heavy operations (10% total)
    uploadFile: 7,
    markAttendance: 3,
  },

  // Stress test weights - heavier writes and uploads
  stress: {
    // Read operations (40% total)
    listClassrooms: 15,
    listPosts: 15,
    downloadFile: 10,

    // Write operations (40% total)
    createSimplePost: 15,
    createPostWithAttachment: 10,
    createClassroom: 10,
    joinClassroom: 5,

    // Heavy operations (20% total)
    uploadFile: 15,
    markAttendance: 5,
  },

  // Spike test weights - quick operations
  spike: {
    // Mostly reads for spike tests
    listClassrooms: 35,
    listPosts: 30,
    downloadFile: 20,

    // Minimal writes
    createSimplePost: 10,
    joinClassroom: 5,
  },
};

/**
 * Selects a task based on weighted probabilities
 *
 * @param {Object} taskWeights - Object with task names as keys and weights as values
 * @returns {string} - Selected task name
 */
export function selectTask(taskWeights) {
  const entries = Object.entries(taskWeights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let random = Math.random() * totalWeight;

  for (const [taskName, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return taskName;
    }
  }

  // Fallback to first task (should never reach here)
  return entries[0][0];
}

/**
 * Creates a task executor that runs tasks based on weights
 *
 * @param {Object} tasks - Object with task names as keys and task functions as values
 * @param {Object} taskWeights - Weight configuration
 * @returns {Function} - Executor function that selects and runs a task
 */
export function createTaskExecutor(tasks, taskWeights) {
  return function executeRandomTask(client, context) {
    const selectedTask = selectTask(taskWeights);
    const taskFn = tasks[selectedTask];

    if (typeof taskFn !== 'function') {
      console.error(`Task "${selectedTask}" is not a valid function`);
      return null;
    }

    return {
      taskName: selectedTask,
      result: taskFn(client, context),
    };
  };
}

/**
 * Gets the weight configuration for a scenario
 *
 * @param {string} scenario - Scenario name (load, stress, spike)
 * @returns {Object} - Weight configuration
 */
export function getWeightsForScenario(scenario) {
  return weights[scenario] || weights.load;
}
