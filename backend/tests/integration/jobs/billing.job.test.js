/**
 * Billing Job Tests
 *
 * Tests for billing background jobs.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock models and services
jest.mock('../../../src/models/Invoice.js');
jest.mock('../../../src/models/Organization.js');
jest.mock('../../../src/models/Notification.js');
jest.mock('../../../src/models/AuditLog.js');
jest.mock('../../../src/services/billing.service.js');
jest.mock('../../../src/services/payment.service.js');
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

import Invoice from '../../../src/models/Invoice.js';
import Organization from '../../../src/models/Organization.js';
import Notification from '../../../src/models/Notification.js';
import AuditLog from '../../../src/models/AuditLog.js';
import billingService from '../../../src/services/billing.service.js';
import paymentService from '../../../src/services/payment.service.js';
import billingJob, { BILLING_TYPES } from '../../../src/jobs/billing.job.js';

describe('Billing Job', () => {
  let mockQueueService;

  beforeEach(() => {
    mockQueueService = {
      registerProcessor: jest.fn(),
      addRecurringJob: jest.fn(),
      add: jest.fn()
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register all billing job processors', async () => {
      await billingJob.register(mockQueueService);

      expect(mockQueueService.registerProcessor).toHaveBeenCalledWith(
        BILLING_TYPES.GENERATE_INVOICE,
        expect.any(Function)
      );
      expect(mockQueueService.registerProcessor).toHaveBeenCalledWith(
        BILLING_TYPES.PAYMENT_REMINDER,
        expect.any(Function)
      );
      expect(mockQueueService.registerProcessor).toHaveBeenCalledWith(
        BILLING_TYPES.SUBSCRIPTION_RENEWAL,
        expect.any(Function)
      );
      expect(mockQueueService.registerProcessor).toHaveBeenCalledWith(
        BILLING_TYPES.OVERDUE_CHECK,
        expect.any(Function)
      );
    });
  });

  describe('processGenerateInvoice', () => {
    it('should generate invoice successfully', async () => {
      const mockOrganization = {
        _id: 'org123',
        name: 'Test Org',
        subscription: { plan: 'starter' }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV-2024-0001',
        total: 29.99,
        currency: 'USD'
      };

      Organization.findById = jest.fn().mockResolvedValue(mockOrganization);
      billingService.generateInvoice = jest.fn().mockResolvedValue(mockInvoice);
      Notification.create = jest.fn().mockResolvedValue({});

      const result = await billingJob.processGenerateInvoice({
        data: {
          organizationId: 'org123',
          planId: 'starter',
          billingCycle: 'monthly',
          userId: 'user123'
        }
      });

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('inv123');
      expect(Notification.create).toHaveBeenCalled();
    });

    it('should handle organization not found', async () => {
      Organization.findById = jest.fn().mockResolvedValue(null);

      await expect(billingJob.processGenerateInvoice({
        data: { organizationId: 'nonexistent' }
      })).rejects.toThrow();
    });
  });

  describe('processPaymentReminder', () => {
    it('should send reminders for overdue invoices', async () => {
      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV-001',
        organization: 'org123',
        total: 100,
        currency: 'USD',
        daysOverdue: 3,
        sendReminder: jest.fn().mockResolvedValue(true)
      };

      Invoice.findOverdue = jest.fn().mockResolvedValue([mockInvoice]);
      Organization.findById = jest.fn().mockResolvedValue({ _id: 'org123' });
      Notification.create = jest.fn().mockResolvedValue({});

      const result = await billingJob.processPaymentReminder({ data: {} });

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should only send reminders on specific days', async () => {
      // Test day 3 - should send
      const mockInvoice3 = {
        _id: 'inv3',
        daysOverdue: 3,
        sendReminder: jest.fn()
      };

      Invoice.findOverdue = jest.fn().mockResolvedValue([mockInvoice3]);
      Organization.findById = jest.fn().mockResolvedValue({});
      Notification.create = jest.fn();

      await billingJob.processPaymentReminder({ data: {} });
      expect(Notification.create).toHaveBeenCalled();
    });
  });

  describe('processOverdueCheck', () => {
    it('should identify and handle overdue invoices', async () => {
      const mockInvoice = {
        _id: 'inv123',
        organization: 'org123',
        daysOverdue: 5
      };

      Invoice.findOverdue = jest.fn().mockResolvedValue([mockInvoice]);
      Organization.findById = jest.fn().mockResolvedValue({
        _id: 'org123',
        subscription: { status: 'active' },
        save: jest.fn()
      });

      const result = await billingJob.processOverdueCheck({ data: {} });

      expect(result.checked).toBe(1);
      expect(result.overdue).toBe(1);
    });

    it('should suspend organizations with very overdue invoices', async () => {
      const mockInvoice = {
        _id: 'inv123',
        organization: 'org123',
        daysOverdue: 35
      };

      const mockOrganization = {
        _id: 'org123',
        subscription: { status: 'active' },
        save: jest.fn()
      };

      Invoice.findOverdue = jest.fn().mockResolvedValue([mockInvoice]);
      Organization.findById = jest.fn().mockResolvedValue(mockOrganization);
      Notification.create = jest.fn();

      const result = await billingJob.processOverdueCheck({ data: {} });

      expect(result.suspended).toBe(1);
      expect(mockOrganization.subscription.status).toBe('suspended');
    });
  });

  describe('processUsageAlert', () => {
    it('should check usage limits and send alerts', async () => {
      const mockOrganization = {
        _id: 'org123',
        subscription: { plan: 'starter', status: 'active' }
      };

      Organization.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockOrganization])
      });

      billingService.getUsage = jest.fn().mockResolvedValue({
        usage: {
          apiCalls: { percentage: 90 },
          tokens: { percentage: 75 }
        }
      });

      Notification.create = jest.fn();

      const result = await billingJob.processUsageAlert({ data: {} });

      expect(result.checked).toBe(1);
      expect(result.alerts).toBe(1); // API calls at 90%
    });
  });
});

describe('BILLING_TYPES', () => {
  it('should export all job types', () => {
    expect(BILLING_TYPES.GENERATE_INVOICE).toBe('billing:generate_invoice');
    expect(BILLING_TYPES.PAYMENT_REMINDER).toBe('billing:payment_reminder');
    expect(BILLING_TYPES.SUBSCRIPTION_RENEWAL).toBe('billing:subscription_renewal');
    expect(BILLING_TYPES.OVERDUE_CHECK).toBe('billing:overdue_check');
    expect(BILLING_TYPES.USAGE_ALERT).toBe('billing:usage_alert');
  });
});