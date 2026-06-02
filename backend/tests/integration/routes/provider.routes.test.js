/**
 * Provider API Routes Integration Tests
 *
 * Tests for Provider CRUD API endpoints.
 */

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app.js';
import Provider from '../../../src/models/Provider.js';
import AIModel from '../../../src/models/AIModel.js';
import User from '../../../src/models/User.js';
import Organization from '../../../src/models/Organization.js';
import { generateToken } from '../../../src/utils/auth.js';

// Mock the auth middleware for testing
jest.mock('../../../src/middlewares/auth.middleware.js', () => ({
  protect: (req, res, next) => {
    req.user = {
      _id: global.testUserId,
      id: global.testUserId,
      role: 'super_admin',
      organization: global.testOrgId
    };
    next();
  },
  restrictTo: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: { message: 'Not authorized' }
      });
    }
  }
}));

describe('Provider API Routes', () => {
  let testToken;
  let testUser;
  let testOrg;

  beforeAll(async () => {
    // Setup test database connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/api-token-manager-test');
    }

    // Create test organization
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test organization for API tests'
    });
    global.testOrgId = testOrg._id.toString();

    // Create test user
    testUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'super_admin',
      organization: testOrg._id
    });
    global.testUserId = testUser._id.toString();

    // Generate test token
    testToken = generateToken(testUser._id);
  });

  afterAll(async () => {
    // Cleanup
    await Provider.deleteMany({});
    await AIModel.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear providers before each test
    await Provider.deleteMany({});
    await AIModel.deleteMany({});
  });

  // ==========================================
  // CREATE Provider Tests
  // ==========================================
  describe('POST /api/providers', () => {
    it('should create a new provider successfully', async () => {
      const providerData = {
        name: 'OpenAI',
        displayName: 'OpenAI',
        description: 'OpenAI API Provider',
        website: 'https://openai.com',
        apiEndpoint: 'https://api.openai.com/v1',
        authType: 'api_key'
      };

      const response = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${testToken}`)
        .send(providerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('OpenAI');
      expect(response.body.data.slug).toBe('openai');
    });

    it('should fail with invalid provider data', async () => {
      const invalidData = {
        name: '', // Empty name should fail
        displayName: ''
      };

      const response = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate provider name', async () => {
      const providerData = {
        name: 'OpenAI',
        displayName: 'OpenAI'
      };

      // Create first provider
      await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${testToken}`)
        .send(providerData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/providers')
        .set('Authorization', `Bearer ${testToken}`)
        .send(providerData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/providers')
        .send({ name: 'Test', displayName: 'Test' });

      // Should return 401 unauthorized
      expect([401, 403]).toContain(response.status);
    });
  });

  // ==========================================
  // READ Provider Tests
  // ==========================================
  describe('GET /api/providers', () => {
    it('should return paginated list of providers', async () => {
      // Create test providers
      await Provider.create([
        { name: 'OpenAI', displayName: 'OpenAI', isActive: true },
        { name: 'Anthropic', displayName: 'Anthropic', isActive: true }
      ]);

      const response = await request(app)
        .get('/api/providers')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter inactive providers', async () => {
      await Provider.create([
        { name: 'ActiveProvider', displayName: 'Active', isActive: true },
        { name: 'InactiveProvider', displayName: 'Inactive', isActive: false }
      ]);

      const response = await request(app)
        .get('/api/providers?activeOnly=true')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('ActiveProvider');
    });

    it('should support pagination', async () => {
      await Provider.create([
        { name: 'Provider1', displayName: 'P1', isActive: true },
        { name: 'Provider2', displayName: 'P2', isActive: true },
        { name: 'Provider3', displayName: 'P3', isActive: true }
      ]);

      const response = await request(app)
        .get('/api/providers?page=1&limit=2')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/providers/:id', () => {
    it('should return provider by ID', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      const response = await request(app)
        .get(`/api/providers/${provider._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('OpenAI');
    });

    it('should return 404 for non-existent provider', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/providers/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/providers/invalid-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/providers/slug/:slug', () => {
    it('should return provider by slug', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      const response = await request(app)
        .get('/api/providers/slug/openai')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('openai');
    });
  });

  // ==========================================
  // UPDATE Provider Tests
  // ==========================================
  describe('PUT /api/providers/:id', () => {
    it('should update provider successfully', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      const updateData = {
        displayName: 'OpenAI Updated',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/providers/${provider._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe('OpenAI Updated');
    });

    it('should not update name (protected field)', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      const response = await request(app)
        .put(`/api/providers/${provider._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'NewName' })
        .expect(200);

      // Name should remain unchanged
      expect(response.body.data.name).toBe('OpenAI');
    });

    it('should return 404 for non-existent provider', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/providers/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ displayName: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // DELETE Provider Tests
  // ==========================================
  describe('DELETE /api/providers/:id', () => {
    it('should soft delete provider with no active models', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/providers/${provider._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Provider deleted successfully');

      // Verify soft delete
      const deletedProvider = await Provider.findById(provider._id);
      expect(deletedProvider.isActive).toBe(false);
    });

    it('should fail to delete provider with active models', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      // Create an active model for this provider
      await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        provider: provider._id,
        type: 'chat',
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/providers/${provider._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('active models');
    });
  });

  // ==========================================
  // GET Provider Models Tests
  // ==========================================
  describe('GET /api/providers/:id/models', () => {
    it('should return models for a provider', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      await AIModel.create([
        {
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: provider._id,
          type: 'chat',
          isActive: true
        },
        {
          name: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          provider: provider._id,
          type: 'chat',
          isActive: true
        }
      ]);

      const response = await request(app)
        .get(`/api/providers/${provider._id}/models`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should filter models by type', async () => {
      const provider = await Provider.create({
        name: 'OpenAI',
        displayName: 'OpenAI',
        isActive: true
      });

      await AIModel.create([
        {
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: provider._id,
          type: 'chat',
          isActive: true
        },
        {
          name: 'whisper',
          displayName: 'Whisper',
          provider: provider._id,
          type: 'audio',
          isActive: true
        }
      ]);

      const response = await request(app)
        .get(`/api/providers/${provider._id}/models?type=chat`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].type).toBe('chat');
    });
  });
});