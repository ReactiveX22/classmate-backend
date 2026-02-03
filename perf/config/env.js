/**
 * Environment Configuration for k6 Performance Tests
 *
 * Usage:
 *   k6 run main.js --env ENV=local
 *   k6 run main.js --env ENV=staging --env BASE_URL=https://staging.example.com
 */

export const config = {
  local: {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    origin: __ENV.ORIGIN || 'http://localhost:3001',
    apiPrefix: '/api/v1',
    authPrefix: '/api/v1/auth',
    timeout: '60s',
    debug: true,
  },
  staging: {
    baseUrl: __ENV.BASE_URL || 'https://staging.classmate.com',
    apiPrefix: '/api/v1',
    authPrefix: '/api/v1/auth',
    timeout: '30s',
    debug: false,
  },
  production: {
    baseUrl: __ENV.BASE_URL || 'https://api.classmate.com',
    apiPrefix: '/api/v1',
    authPrefix: '/api/v1/auth',
    timeout: '15s',
    debug: false,
  },
};

export function getConfig(env = 'local') {
  const envConfig = config[env] || config.local;
  return {
    ...envConfig,
    env,
    fullApiUrl: `${envConfig.baseUrl}${envConfig.apiPrefix}`,
    fullAuthUrl: `${envConfig.baseUrl}${envConfig.authPrefix}`,
  };
}

// Export current environment config
export const currentEnv = __ENV.ENV || 'local';
export const currentConfig = getConfig(currentEnv);
