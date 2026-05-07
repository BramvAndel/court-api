// jest.setup.js
require('dotenv').config({ path: '.env.test' });

// Suppress console logs during tests unless TEST_VERBOSE is set
if (!process.env.TEST_VERBOSE) {
  global.console.log = jest.fn();
  global.console.info = jest.fn();
}

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-12345';
