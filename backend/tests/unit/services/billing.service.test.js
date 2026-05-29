/**
 * Billing Service Tests
 *
 * Unit tests for billing operations.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import billingService from '../../../src/services/billing.service.js';

// Mock models
jest.mock('../../../src/models/Organization.js', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../../../src/models/Invoice.js', () => ({
  create: jest.fn(),
  findByOrganization: jest.fn(),
  findOne: jest.fn(),
  generateInvoiceNumber: jest.fn()
}));

jest.mock('../../../src/models/AuditLog.js', () => ({
  log: jest.fn()
}));

jest.mock('../../../src/models/Notification.js', () => ({
  create: jest.fn()
}));

jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

import Organization from '../../../src/models/Organization.js';
import Invoice from '../../../src/models/Invoice.js';
import AuditLog from '../../../src/models/AuditLog.js';
import Notification from '../../../src/models/Notification.js';

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBilling', () => {
    it('should return billing information for organization', async () => {
      const mockOrg = {
        _id: 'org123',
        name: 'Test Org',
        owner: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        subscription: {
          plan: 'starter',
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        billingDetails: {
          companyName: 'Test Company',
          address: '123 Main St'
        },
        paymentMethods: [{
          id: 'pm_123',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          isDefault: true
        }],
        populate: jest.fn().mockReturnThis()
      };

      Organization.findById.mockResolvedValue(mockOrg);

      const result = await billingService.getBilling('org123');

      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('plan');
      expect(result).toHaveProperty('billingDetails');
      expect(result).toHaveProperty('paymentMethods');
    });

    it('should throw error for non-existent organization', async () => {
      Organization.findById.mockResolvedValue(null);

      await expect(billingService.getBilling('nonexistent'))
        .rejects.toThrow('Organization not found');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription plan successfully', async () => {
      const mockOrg = {
        _id: 'org123',
        name: 'Test Org',
        subscription: { plan: 'free' },
        paymentMethods: [{ id: 'pm_123', isDefault: true, provider: 'stripe' }],
        save: jest.fn()
      };

      Organization.findById.mockResolvedValue(mockOrg);
      Invoice.generateInvoiceNumber.mockResolvedValue('INV-2024-001');
      Invoice.create.mockResolvedValue({ _id: 'inv123' });

      const result = await billingService.updateSubscription('org123', 'starter', 'monthly', 'user123');

      expect(result).toHaveProperty('subscription');
      expect(mockOrg.subscription.plan).toBe('starter');
    });

    it('should reject invalid plan', async () => {
      Organization.findById.mockResolvedValue({ _id: 'org123' });

      await expect(billingService.updateSubscription('org123', 'invalid', 'monthly', 'user123'))
        .rejects.toThrow('Invalid subscription plan');
    });

    it('should reject enterprise plan without sales contact', async () => {
      Organization.findById.mockResolvedValue({ _id: 'org123' });

      await expect(billingService.updateSubscription('org123', 'enterprise', 'monthly', 'user123'))
        .rejects.toThrow('contact sales');
    });

    it('should require payment method for paid plans', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: { plan: 'free' },
        paymentMethods: []
      };

      Organization.findById.mockResolvedValue(mockOrg);

      await expect(billingService.updateSubscription('org123', 'starter', 'monthly', 'user123'))
        .rejects.toThrow('payment method');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: {
          plan: 'starter',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        save: jest.fn()
      };

      Organization.findById.mockResolvedValue(mockOrg);

      const result = await billingService.cancelSubscription('org123', 'No longer needed', 'user123');

      expect(result.status).toBe('cancelled');
      expect(mockOrg.subscription.status).toBe('cancelled');
    });

    it('should reject cancellation for free plan', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: { plan: 'free' }
      };

      Organization.findById.mockResolvedValue(mockOrg);

      await expect(billingService.cancelSubscription('org123', 'reason', 'user123'))
        .rejects.toThrow('No active subscription');
    });

    it('should reject already cancelled subscription', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: { plan: 'starter', status: 'cancelled' }
      };

      Organization.findById.mockResolvedValue(mockOrg);

      await expect(billingService.cancelSubscription('org123', 'reason', 'user123'))
        .rejects.toThrow('already cancelled');
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate cancelled subscription', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: {
          plan: 'starter',
          status: 'cancelled',
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        },
        save: jest.fn()
      };

      Organization.findById.mockResolvedValue(mockOrg);

      const result = await billingService.reactivateSubscription('org123', 'user123');

      expect(result.status).toBe('active');
      expect(mockOrg.subscription.status).toBe('active');
    });

    it('should reject reactivation of active subscription', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: { status: 'active' }
      };

      Organization.findById.mockResolvedValue(mockOrg);

      await expect(billingService.reactivateSubscription('org123', 'user123'))
        .rejects.toThrow('not cancelled');
    });
  });

  describe('getUsage', () => {
    it('should return usage summary', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: { plan: 'starter' },
        members: [{ user: 'user1' }, { user: 'user2' }]
      };

      Organization.findById.mockResolvedValue(mockOrg);

      // Mock Feature aggregation
      jest.mock('../../../src/models/Feature.js', () => ({
        aggregate: jest.fn().mockResolvedValue([{
          totalRequests: 5000,
          totalTokens: 50000,
          totalCost: 25.50
        }]),
        countDocuments: jest.fn().mockResolvedValue(10)
      }));

      const result = await billingService.getUsage('org123');

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('plan');
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for organization', async () => {
      const mockInvoices = [
        { _id: 'inv1', invoiceNumber: 'INV-001', total: 29.99, status: 'paid' },
        { _id: 'inv2', invoiceNumber: 'INV-002', total: 29.99, status: 'pending' }
      ];

      Invoice.findByOrganization.mockResolvedValue(mockInvoices);
      Invoice.countDocuments.mockResolvedValue(2);

      const result = await billingService.getInvoices('org123', 1, 10);

      expect(result.invoices).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add payment method', async () => {
      const mockOrg = {
        _id: 'org123',
        paymentMethods: [],
        save: jest.fn()
      };

      Organization.findById.mockResolvedValue(mockOrg);

      const result = await billingService.addPaymentMethod('org123', {
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025
      }, 'user123');

      expect(result).toHaveProperty('id');
      expect(result.isDefault).toBe(true);
    });

    it('should validate last4 digits', async () => {
      Organization.findById.mockResolvedValue({ _id: 'org123' });

      await expect(billingService.addPaymentMethod('org123', {
        last4: '12' // Invalid
      }, 'user123')).rejects.toThrow('4 digits');
    });
  });

  describe('getAvailablePlans', () => {
    it('should return available plans', async () => {
      const result = await billingService.getAvailablePlans();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('price');
    });
  });

  describe('previewSubscriptionChange', () => {
    it('should preview subscription change', async () => {
      const mockOrg = {
        _id: 'org123',
        subscription: {
          plan: 'free',
          billingCycle: 'monthly'
        }
      };

      Organization.findById.mockResolvedValue(mockOrg);

      const result = await billingService.previewSubscriptionChange('org123', 'starter', 'monthly');

      expect(result).toHaveProperty('currentPlan');
      expect(result).toHaveProperty('newPlan');
      expect(result).toHaveProperty('change');
    });

    it('should return contact sales for enterprise preview', async () => {
      Organization.findById.mockResolvedValue({ _id: 'org123', subscription: { plan: 'free' } });

      const result = await billingService.previewSubscriptionChange('org123', 'enterprise', 'monthly');

      expect(result.newPlan.price).toBe('Contact Sales');
    });
  });
});