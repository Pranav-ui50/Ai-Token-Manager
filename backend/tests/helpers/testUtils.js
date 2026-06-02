/**
 * Test Utilities
 *
 * Helper functions for integration tests
 */

import User from '../../src/models/User.js';
import Organization from '../../src/models/Organization.js';
import Provider from '../../src/models/Provider.js';
import Model from '../../src/models/AIModel.js';
import Feature from '../../src/models/Feature.js';
import Plan from '../../src/models/Plan.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../../src/config/index.js';

/**
 * Generate a valid JWT token for testing
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      userId: user._id,
      email: user.email,
      role: user.role,
      organization: user.organization
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id,
      userId: user._id,
      type: 'refresh'
    },
    config.jwt.refreshSecret,
    { expiresIn: '7d' }
  );
}

/**
 * Create a test user
 */
export async function createTestUser(overrides = {}) {
  const userData = {
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'TestPassword123!',
    role: overrides.role || 'viewer',
    isActive: true,
    emailVerified: true,
    ...overrides
  };

  const user = await User.create(userData);
  return user;
}

/**
 * Create a test organization
 */
export async function createTestOrganization(overrides = {}) {
  const orgData = {
    name: `Test Org ${Date.now()}`,
    slug: `test-org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'active',
    plan: 'free',
    ...overrides
  };

  if (!orgData.members || orgData.members.length === 0) {
    const owner = await createTestUser({ role: 'org_owner' });
    orgData.members = [{ user: owner._id, role: 'owner' }];
  }

  const organization = await Organization.create(orgData);

  // Update users with organization
  if (orgData.members) {
    await User.updateMany(
      { _id: { $in: orgData.members.map(m => m.user) } },
      { organization: organization._id }
    );
  }

  return organization;
}

/**
 * Create a test provider
 */
export async function createTestProvider(overrides = {}) {
  const providerData = {
    name: `Test Provider ${Date.now()}`,
    displayName: `Test Provider ${Date.now()}`,
    description: 'Test provider for unit tests',
    type: 'llm',
    status: 'active',
    pricing: {
      model: 'per_token',
      currency: 'USD'
    },
    ...overrides
  };

  const provider = await Provider.create(providerData);
  return provider;
}

/**
 * Create a test AI model
 */
export async function createTestModel(overrides = {}) {
  let provider = overrides.provider;
  if (!provider) {
    provider = await createTestProvider();
  }

  const modelData = {
    name: `test-model-${Date.now()}`,
    displayName: `Test Model ${Date.now()}`,
    provider: provider._id,
    type: 'chat',
    status: 'active',
    pricing: {
      inputPrice: 0.01,
      outputPrice: 0.02,
      unit: 'per_1k_tokens'
    },
    contextWindow: 4096,
    maxTokens: 2048,
    ...overrides
  };

  const model = await Model.create(modelData);
  return model;
}

/**
 * Create a test feature
 */
export async function createTestFeature(overrides = {}) {
  let organization = overrides.organization;
  if (!organization) {
    const org = await createTestOrganization();
    organization = org._id;
  }

  const featureData = {
    name: `Test Feature ${Date.now()}`,
    description: 'Test feature for unit tests',
    organization: organization,
    model: overrides.model || null,
    status: 'active',
    tokenEstimates: {
      inputTokens: 1000,
      outputTokens: 500
    },
    estimatedCost: 0.05,
    ...overrides
  };

  const feature = await Feature.create(featureData);
  return feature;
}

/**
 * Create a test plan
 */
export async function createTestPlan(overrides = {}) {
  let organization = overrides.organization;
  if (!organization) {
    const org = await createTestOrganization();
    organization = org._id;
  }

  const planData = {
    name: `Test Plan ${Date.now()}`,
    organization: organization,
    status: 'active',
    pricing: {
      monthlyPrice: 29.99,
      yearlyPrice: 299.99,
      currency: 'USD'
    },
    features: [],
    limits: {
      maxUsers: 10,
      maxTokens: 1000000,
      maxProjects: 5
    },
    ...overrides
  };

  const plan = await Plan.create(planData);
  return plan;
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  const collections = mongoose.connection.collections;

  for (const collectionName of Object.keys(collections)) {
    try {
      await collections[collectionName].deleteMany({});
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Create mock request object
 */
export function mockRequest(overrides = {}) {
  return {
    user: {
      id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'org_owner',
      organization: new mongoose.Types.ObjectId()
    },
    params: {},
    query: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides
  };
}

/**
 * Create mock response object
 */
export function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Generate random ID
 */
export function generateId() {
  return new mongoose.Types.ObjectId();
}

/**
 * Generate random email
 */
export function generateEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
}

/**
 * Sleep utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  generateToken,
  generateRefreshToken,
  createTestUser,
  createTestOrganization,
  createTestProvider,
  createTestModel,
  createTestFeature,
  createTestPlan,
  cleanupTestData,
  waitFor,
  mockRequest,
  mockResponse,
  generateId,
  generateEmail,
  sleep
};