/**
 * Jest Test Setup
 *
 * Global setup configuration for Jest tests.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager-test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Test timeouts
jest.setTimeout(30000);

// Suppress console logs in tests (uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   // Keep error for debugging failed tests
//   error: console.error
// };

// Global test utilities
global.testUtils = {
  // Generate mock ObjectId
  mockObjectId: () => {
    const mongoose = require('mongoose');
    return new mongoose.Types.ObjectId().toString();
  },

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock request object
  mockRequest: (overrides = {}) => ({
    headers: {},
    params: {},
    query: {},
    body: {},
    user: null,
    ...overrides
  }),

  // Create mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  },

  // Create mock next function
  mockNext: () => jest.fn()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});