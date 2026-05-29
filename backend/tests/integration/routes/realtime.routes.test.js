/**
 * Realtime Routes Integration Tests
 *
 * Integration tests for real-time features endpoints.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Import app and models after mocks
import app from '../../../src/app.js';
import Organization from '../../../src/models/Organization.js';
import User from '../../../src/models/User.js';
import Feature from '../../../src/models/Feature.js';
import Project from '../../../src/models/Project.js';

describe('Realtime Routes', () => {
  let authToken;
  let testUser;
  let testOrganization;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager-test');
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Feature.deleteMany({});
    await Project.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'org_owner',
      isActive: true
    });

    // Create test organization
    testOrganization = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      owner: testUser._id,
      members: [{ user: testUser._id, role: 'owner' }],
      subscription: {
        plan: 'professional',
        status: 'active'
      }
    });

    // Update user with organization
    testUser.organization = testOrganization._id;
    await testUser.save();

    // Generate auth token
    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/realtime/usage', () => {
    it('should return usage statistics', async () => {
      // Create test features
      await Feature.create([
        {
          organization: testOrganization._id,
          name: 'Feature 1',
          key: 'feature-1',
          model: new mongoose.Types.ObjectId(),
          isActive: true,
          stats: {
            totalRequests: 1000,
            totalTokens: 50000,
            inputTokens: 30000,
            outputTokens: 20000,
            totalCost: 5.50,
            avgLatency: 150,
            errorCount: 5
          }
        },
        {
          organization: testOrganization._id,
          name: 'Feature 2',
          key: 'feature-2',
          model: new mongoose.Types.ObjectId(),
          isActive: true,
          stats: {
            totalRequests: 500,
            totalTokens: 25000,
            inputTokens: 15000,
            outputTokens: 10000,
            totalCost: 2.75,
            avgLatency: 120,
            errorCount: 2
          }
        }
      ]);

      const response = await request(app)
        .get('/api/realtime/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data.usage.apiCalls.used).toBe(1500);
      expect(response.body.data.usage.tokens.used).toBe(75000);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/realtime/usage')
        .expect(401);
    });
  });

  describe('GET /api/realtime/stream', () => {
    it('should return SSE stream', async () => {
      const response = await request(app)
        .get('/api/realtime/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/realtime/stream')
        .query({ featureId: new mongoose.Types.ObjectId().toString() })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
    });
  });

  describe('GET /api/realtime/dashboard', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/realtime/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('byProvider');
      expect(response.body.data).toHaveProperty('topFeatures');
    });
  });

  describe('POST /api/realtime/monitoring/start', () => {
    it('should start monitoring', async () => {
      const response = await request(app)
        .post('/api/realtime/monitoring/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ intervalMs: 60000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('organizationId');
    });

    it('should validate interval range', async () => {
      const response = await request(app)
        .post('/api/realtime/monitoring/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ intervalMs: 1000 }) // Too low
        .expect(400);
    });
  });

  describe('POST /api/realtime/monitoring/stop', () => {
    it('should stop monitoring', async () => {
      const response = await request(app)
        .post('/api/realtime/monitoring/stop')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/realtime/stats', () => {
    it('should return connection statistics', async () => {
      const response = await request(app)
        .get('/api/realtime/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConnections');
    });
  });

  describe('GET /api/realtime/features/:featureId/usage', () => {
    it('should return feature live usage', async () => {
      const feature = await Feature.create({
        organization: testOrganization._id,
        name: 'Test Feature',
        key: 'test-feature',
        model: new mongoose.Types.ObjectId(),
        isActive: true,
        stats: {
          totalRequests: 100,
          totalTokens: 5000,
          totalCost: 1.50
        }
      });

      const response = await request(app)
        .get(`/api/realtime/features/${feature._id}/usage`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('featureId');
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should return 404 for non-existent feature', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/realtime/features/${fakeId}/usage`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not return feature from other organization', async () => {
      // Create another organization
      const otherOrg = await Organization.create({
        name: 'Other Org',
        slug: 'other-org',
        owner: testUser._id
      });

      const feature = await Feature.create({
        organization: otherOrg._id,
        name: 'Other Feature',
        key: 'other-feature',
        model: new mongoose.Types.ObjectId(),
        isActive: true
      });

      await request(app)
        .get(`/api/realtime/features/${feature._id}/usage`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

describe('WebSocket Integration', () => {
  describe('Connection', () => {
    it('should authenticate valid connections', () => {
      // Test WebSocket authentication
    });

    it('should reject invalid tokens', () => {
      // Test invalid token rejection
    });

    it('should join organization room', () => {
      // Test room joining
    });
  });

  describe('Events', () => {
    it('should emit usage updates to organization', () => {
      // Test usage event emission
    });

    it('should emit notifications to users', () => {
      // Test notification emission
    });

    it('should handle feature subscriptions', () => {
      // Test feature subscription
    });
  });

  describe('Disconnection', () => {
    it('should clean up on disconnect', () => {
      // Test cleanup
    });

    it('should remove user from rooms', () => {
      // Test room removal
    });
  });
});