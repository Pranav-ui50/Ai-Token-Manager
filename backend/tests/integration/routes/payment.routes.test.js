/**
 * Payment Routes Integration Tests
 *
 * Integration tests for payment endpoints.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock Stripe and Razorpay
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test',
          expires_at: Math.floor(Date.now() / 1000) + 3600
        })
      }
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000
      })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret_test'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test123',
        status: 'succeeded'
      })
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test123',
        amount: 2900,
        currency: 'INR'
      })
    },
    payments: {
      fetch: jest.fn().mockResolvedValue({
        id: 'pay_test123',
        status: 'captured'
      }),
      refund: jest.fn().mockResolvedValue({
        id: 'rfn_test123',
        status: 'processed'
      })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'created'
      })
    }
  }));
});

// Mock config
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
import Invoice from '../../../src/models/Invoice.js';

describe('Payment Routes', () => {
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
    await Invoice.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'org_owner',
      isActive: true
    });

    // Create test organization with payment method
    testOrganization = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      owner: testUser._id,
      members: [{ user: testUser._id, role: 'owner' }],
      subscription: {
        plan: 'starter',
        status: 'active',
        billingCycle: 'monthly'
      },
      billingDetails: {
        companyName: 'Test Company',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94105'
      },
      paymentMethods: [{
        id: 'pm_test123',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
        provider: 'stripe'
      }]
    });

    // Update user with organization
    testUser.organization = testOrganization._id;
    await testUser.save();

    // Generate auth token
    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/payment/config', () => {
    it('should return payment configuration', async () => {
      const response = await request(app)
        .get('/api/payment/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stripe');
      expect(response.body.data).toHaveProperty('razorpay');
    });
  });

  describe('GET /api/payment/plans', () => {
    it('should return available subscription plans', async () => {
      const response = await request(app)
        .get('/api/payment/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/payment/checkout/stripe', () => {
    it('should create Stripe checkout session', async () => {
      const response = await request(app)
        .post('/api/payment/checkout/stripe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'starter',
          billingCycle: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('url');
    });

    it('should reject enterprise plan', async () => {
      const response = await request(app)
        .post('/api/payment/checkout/stripe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'enterprise',
          billingCycle: 'monthly'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid plan', async () => {
      const response = await request(app)
        .post('/api/payment/checkout/stripe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'invalid_plan',
          billingCycle: 'monthly'
        })
        .expect(400);
    });
  });

  describe('POST /api/payment/order/razorpay', () => {
    it('should create Razorpay order', async () => {
      const response = await request(app)
        .post('/api/payment/order/razorpay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'starter',
          billingCycle: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('amount');
    });
  });

  describe('GET /api/payment/methods', () => {
    it('should return payment methods', async () => {
      const response = await request(app)
        .get('/api/payment/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/payment/methods', () => {
    it('should add payment method', async () => {
      const response = await request(app)
        .post('/api/payment/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'card',
          last4: '1234',
          brand: 'mastercard',
          expiryMonth: 6,
          expiryYear: 2026,
          provider: 'stripe'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should validate payment method data', async () => {
      const response = await request(app)
        .post('/api/payment/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'card',
          last4: '12' // Invalid - should be 4 digits
        })
        .expect(400);
    });
  });

  describe('DELETE /api/payment/methods/:methodId', () => {
    it('should remove payment method', async () => {
      // First add a second payment method
      testOrganization.paymentMethods.push({
        id: 'pm_test456',
        type: 'card',
        last4: '5678',
        brand: 'mastercard',
        isDefault: false
      });
      await testOrganization.save();

      const response = await request(app)
        .delete('/api/payment/methods/pm_test456')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent payment method', async () => {
      await request(app)
        .delete('/api/payment/methods/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/payment/methods/:methodId/default', () => {
    it('should set default payment method', async () => {
      // Add a second payment method
      testOrganization.paymentMethods.push({
        id: 'pm_test456',
        type: 'card',
        last4: '5678',
        brand: 'mastercard',
        isDefault: false
      });
      await testOrganization.save();

      const response = await request(app)
        .put('/api/payment/methods/pm_test456/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});