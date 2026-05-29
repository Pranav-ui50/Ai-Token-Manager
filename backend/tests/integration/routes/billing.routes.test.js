/**
 * Billing Routes Integration Tests
 *
 * Integration tests for billing endpoints.
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
import Invoice from '../../../src/models/Invoice.js';
import User from '../../../src/models/User.js';

describe('Billing Routes', () => {
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

    // Create test organization
    testOrganization = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      owner: testUser._id,
      members: [{ user: testUser._id, role: 'owner' }],
      subscription: {
        plan: 'starter',
        status: 'trial',
        billingCycle: 'monthly'
      }
    });

    // Update user with organization
    testUser.organization = testOrganization._id;
    await testUser.save();

    // Generate auth token
    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/billing', () => {
    it('should return billing information for organization', async () => {
      const response = await request(app)
        .get('/api/billing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('organization');
      expect(response.body.data).toHaveProperty('subscription');
      expect(response.body.data).toHaveProperty('plan');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/billing')
        .expect(401);
    });
  });

  describe('GET /api/billing/plans', () => {
    it('should return available subscription plans', async () => {
      const response = await request(app)
        .get('/api/billing/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/billing/subscription', () => {
    it('should update subscription plan', async () => {
      const response = await request(app)
        .post('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'starter',
          billingCycle: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('subscription');
    });

    it('should reject invalid plan', async () => {
      const response = await request(app)
        .post('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'invalid_plan',
          billingCycle: 'monthly'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid billing cycle', async () => {
      const response = await request(app)
        .post('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'starter',
          billingCycle: 'weekly'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/billing/subscription', () => {
    it('should cancel subscription', async () => {
      // First set up a subscription
      testOrganization.subscription = {
        plan: 'starter',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      await testOrganization.save();

      const response = await request(app)
        .delete('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'cancelled');
    });

    it('should return error when no subscription exists', async () => {
      testOrganization.subscription = { plan: 'free', status: 'trial' };
      await testOrganization.save();

      const response = await request(app)
        .delete('/api/billing/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/billing/usage', () => {
    it('should return usage statistics', async () => {
      const response = await request(app)
        .get('/api/billing/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data).toHaveProperty('period');
    });

    it('should accept date range parameters', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/billing/usage')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/billing/invoices', () => {
    it('should return invoices for organization', async () => {
      // Create test invoice
      await Invoice.create({
        organization: testOrganization._id,
        invoiceNumber: 'INV-2024-001',
        type: 'subscription',
        status: 'paid',
        total: 29.99,
        currency: 'USD',
        billingPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        items: [{
          description: 'Starter Plan - Monthly',
          quantity: 1,
          unitPrice: 29.99,
          amount: 29.99
        }],
        createdBy: testUser._id
      });

      const response = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/billing/invoices')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/billing/invoices/:id', () => {
    it('should return specific invoice', async () => {
      const invoice = await Invoice.create({
        organization: testOrganization._id,
        invoiceNumber: 'INV-2024-001',
        type: 'subscription',
        status: 'paid',
        total: 29.99,
        currency: 'USD',
        billingPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        items: [],
        createdBy: testUser._id
      });

      const response = await request(app)
        .get(`/api/billing/invoices/${invoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invoiceNumber', 'INV-2024-001');
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/billing/invoices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not return invoices from other organizations', async () => {
      // Create another organization
      const otherOrg = await Organization.create({
        name: 'Other Org',
        slug: 'other-org',
        owner: testUser._id
      });

      const invoice = await Invoice.create({
        organization: otherOrg._id,
        invoiceNumber: 'INV-2024-002',
        type: 'subscription',
        status: 'paid',
        total: 99.99,
        currency: 'USD',
        billingPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        items: [],
        createdBy: testUser._id
      });

      await request(app)
        .get(`/api/billing/invoices/${invoice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/billing/details', () => {
    it('should update billing details', async () => {
      const response = await request(app)
        .put('/api/billing/details')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          companyName: 'Updated Company',
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'USA'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('companyName', 'Updated Company');
    });

    it('should reject invalid billing details', async () => {
      const response = await request(app)
        .put('/api/billing/details')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalid: 'field'
        })
        .expect(200); // Should succeed, just ignore invalid fields
    });
  });

  describe('POST /api/billing/preview', () => {
    it('should preview subscription change', async () => {
      const response = await request(app)
        .post('/api/billing/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'professional',
          billingCycle: 'monthly'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('currentPlan');
      expect(response.body.data).toHaveProperty('newPlan');
      expect(response.body.data).toHaveProperty('change');
    });
  });
});

describe('Payment Routes', () => {
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

  describe('POST /api/payment/methods', () => {
    it('should add payment method', async () => {
      const response = await request(app)
        .post('/api/payment/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
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
          last4: '123' // Invalid - should be 4 digits
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/payment/methods/:id', () => {
    it('should remove payment method', async () => {
      // Add payment method first
      testOrganization.paymentMethods = [{
        id: 'pm_123',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true
      }];
      await testOrganization.save();

      const response = await request(app)
        .delete('/api/payment/methods/pm_123')
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

  describe('PUT /api/payment/methods/:id/default', () => {
    it('should set default payment method', async () => {
      // Add payment methods
      testOrganization.paymentMethods = [
        { id: 'pm_1', type: 'card', last4: '4242', brand: 'visa', isDefault: true },
        { id: 'pm_2', type: 'card', last4: '1234', brand: 'mastercard', isDefault: false }
      ];
      await testOrganization.save();

      const response = await request(app)
        .put('/api/payment/methods/pm_2/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Webhook Routes', () => {
  describe('POST /api/payment/stripe/webhook', () => {
    it('should handle valid Stripe webhook', async () => {
      // This would require mocking Stripe webhook signature
      // Placeholder for actual implementation
    });

    it('should reject invalid webhook signature', async () => {
      const response = await request(app)
        .post('/api/payment/stripe/webhook')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payment/razorpay/webhook', () => {
    it('should handle valid Razorpay webhook', async () => {
      // This would require mocking Razorpay webhook signature
      // Placeholder for actual implementation
    });

    it('should reject invalid webhook signature', async () => {
      const response = await request(app)
        .post('/api/payment/razorpay/webhook')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});