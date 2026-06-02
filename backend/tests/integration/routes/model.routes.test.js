/**
 * Model API Routes Integration Tests
 *
 * Tests for AI Model CRUD API endpoints.
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

describe('Model API Routes', () => {
  let testToken;
  let testUser;
  let testOrg;
  let testProvider;

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
    // Clear data before each test
    await AIModel.deleteMany({});
    await Provider.deleteMany({});

    // Create test provider for each test
    testProvider = await Provider.create({
      name: 'OpenAI',
      displayName: 'OpenAI',
      isActive: true
    });
  });

  // ==========================================
  // CREATE Model Tests
  // ==========================================
  describe('POST /api/models', () => {
    it('should create a new model successfully', async () => {
      const modelData = {
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        pricing: {
          inputPrice: 30,
          outputPrice: 60,
          currency: 'USD'
        },
        capabilities: {
          supportsVision: true,
          contextWindow: 128000
        }
      };

      const response = await request(app)
        .post('/api/models')
        .set('Authorization', `Bearer ${testToken}`)
        .send(modelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('gpt-4');
    });

    it('should fail with invalid model type', async () => {
      const invalidData = {
        name: 'test-model',
        displayName: 'Test Model',
        type: 'invalid_type',
        provider: testProvider._id
      };

      const response = await request(app)
        .post('/api/models')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without provider', async () => {
      const invalidData = {
        name: 'test-model',
        displayName: 'Test Model',
        type: 'chat'
        // Missing provider
      };

      const response = await request(app)
        .post('/api/models')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create model with default values', async () => {
      const modelData = {
        name: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        type: 'chat',
        provider: testProvider._id
      };

      const response = await request(app)
        .post('/api/models')
        .set('Authorization', `Bearer ${testToken}`)
        .send(modelData)
        .expect(201);

      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.pricing.unit).toBe('per_token');
    });
  });

  // ==========================================
  // READ Model Tests
  // ==========================================
  describe('GET /api/models', () => {
    it('should return paginated list of models', async () => {
      await AIModel.create([
        {
          name: 'gpt-4',
          displayName: 'GPT-4',
          type: 'chat',
          provider: testProvider._id,
          isActive: true
        },
        {
          name: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          type: 'chat',
          provider: testProvider._id,
          isActive: true
        }
      ]);

      const response = await request(app)
        .get('/api/models')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should filter by provider', async () => {
      const anotherProvider = await Provider.create({
        name: 'Anthropic',
        displayName: 'Anthropic',
        isActive: true
      });

      await AIModel.create([
        {
          name: 'gpt-4',
          displayName: 'GPT-4',
          type: 'chat',
          provider: testProvider._id,
          isActive: true
        },
        {
          name: 'claude-3',
          displayName: 'Claude 3',
          type: 'chat',
          provider: anotherProvider._id,
          isActive: true
        }
      ]);

      const response = await request(app)
        .get(`/api/models?providerId=${testProvider._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('gpt-4');
    });

    it('should filter by type', async () => {
      await AIModel.create([
        {
          name: 'gpt-4',
          displayName: 'GPT-4',
          type: 'chat',
          provider: testProvider._id,
          isActive: true
        },
        {
          name: 'whisper',
          displayName: 'Whisper',
          type: 'audio',
          provider: testProvider._id,
          isActive: true
        }
      ]);

      const response = await request(app)
        .get('/api/models?type=chat')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
    });

    it('should filter inactive models', async () => {
      await AIModel.create([
        {
          name: 'gpt-4',
          displayName: 'GPT-4',
          type: 'chat',
          provider: testProvider._id,
          isActive: true
        },
        {
          name: 'gpt-3',
          displayName: 'GPT-3',
          type: 'chat',
          provider: testProvider._id,
          isActive: false
        }
      ]);

      const response = await request(app)
        .get('/api/models?activeOnly=true')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].isActive).toBe(true);
    });
  });

  describe('GET /api/models/:id', () => {
    it('should return model by ID', async () => {
      const model = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        isActive: true
      });

      const response = await request(app)
        .get(`/api/models/${model._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('gpt-4');
    });

    it('should return 404 for non-existent model', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/models/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // UPDATE Model Tests
  // ==========================================
  describe('PUT /api/models/:id', () => {
    it('should update model successfully', async () => {
      const model = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        isActive: true
      });

      const updateData = {
        displayName: 'GPT-4 Turbo',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/models/${model._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe('GPT-4 Turbo');
    });

    it('should update pricing and create history', async () => {
      const model = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        pricing: {
          inputPrice: 30,
          outputPrice: 60
        },
        isActive: true
      });

      const updateData = {
        pricing: {
          inputPrice: 25,
          outputPrice: 50
        }
      };

      const response = await request(app)
        .put(`/api/models/${model._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update capabilities', async () => {
      const model = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        isActive: true
      });

      const updateData = {
        capabilities: {
          supportsVision: true,
          contextWindow: 128000,
          maxOutputTokens: 4096
        }
      };

      const response = await request(app)
        .put(`/api/models/${model._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // DELETE Model Tests
  // ==========================================
  describe('DELETE /api/models/:id', () => {
    it('should soft delete model', async () => {
      const model = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/models/${model._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Model deleted successfully');

      // Verify soft delete
      const deletedModel = await AIModel.findById(model._id);
      expect(deletedModel.isActive).toBe(false);
    });
  });

  // ==========================================
  // Calculate Cost Tests
  // ==========================================
  describe('POST /api/models/:id/calculate-cost', () => {
    it('should calculate cost for tokens', async () => {
      const model = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        pricing: {
          inputPrice: 30,
          outputPrice: 60,
          unit: 'per_token',
          pricePerUnit: 1000000
        },
        isActive: true
      });

      const response = await request(app)
        .post(`/api/models/${model._id}/calculate-cost`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          inputTokens: 1000000,
          outputTokens: 500000
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // ==========================================
  // Bulk Pricing Update Tests
  // ==========================================
  describe('POST /api/models/bulk-pricing', () => {
    it('should update pricing for multiple models', async () => {
      const model1 = await AIModel.create({
        name: 'gpt-4',
        displayName: 'GPT-4',
        type: 'chat',
        provider: testProvider._id,
        pricing: { inputPrice: 30, outputPrice: 60 },
        isActive: true
      });

      const model2 = await AIModel.create({
        name: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        type: 'chat',
        provider: testProvider._id,
        pricing: { inputPrice: 1.5, outputPrice: 2 },
        isActive: true
      });

      const updates = [
        {
          modelId: model1._id,
          pricing: { inputPrice: 25, outputPrice: 50 }
        },
        {
          modelId: model2._id,
          pricing: { inputPrice: 1, outputPrice: 2 }
        }
      ];

      const response = await request(app)
        .post('/api/models/bulk-pricing')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ updates })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});