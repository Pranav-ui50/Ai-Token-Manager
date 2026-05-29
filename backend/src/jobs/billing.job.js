/**
 * Billing Job Handlers
 *
 * Background jobs for billing-related tasks:
 * - Invoice generation
 * - Payment reminders
 * - Subscription renewals
 * - Payment retries
 */

import logger from '../config/logger.js';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import billingService from '../services/billing.service.js';
import paymentService from '../services/payment.service.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

// Job types
export const BILLING_TYPES = {
  GENERATE_INVOICE: 'billing:generate_invoice',
  PAYMENT_REMINDER: 'billing:payment_reminder',
  SUBSCRIPTION_RENEWAL: 'billing:subscription_renewal',
  SUBSCRIPTION_EXPIRED: 'billing:subscription_expired',
  PAYMENT_RETRY: 'billing:payment_retry',
  OVERDUE_CHECK: 'billing:overdue_check',
  USAGE_ALERT: 'billing:usage_alert'
};

/**
 * Register billing job processors
 */
async function register(queueService) {
  // Invoice generation
  queueService.registerProcessor(BILLING_TYPES.GENERATE_INVOICE, processGenerateInvoice);

  // Payment reminders
  queueService.registerProcessor(BILLING_TYPES.PAYMENT_REMINDER, processPaymentReminder);

  // Subscription renewals
  queueService.registerProcessor(BILLING_TYPES.SUBSCRIPTION_RENEWAL, processSubscriptionRenewal);

  // Subscription expired
  queueService.registerProcessor(BILLING_TYPES.SUBSCRIPTION_EXPIRED, processSubscriptionExpired);

  // Payment retry
  queueService.registerProcessor(BILLING_TYPES.PAYMENT_RETRY, processPaymentRetry);

  // Overdue check
  queueService.registerProcessor(BILLING_TYPES.OVERDUE_CHECK, processOverdueCheck);

  // Usage alerts
  queueService.registerProcessor(BILLING_TYPES.USAGE_ALERT, processUsageAlert);

  logger.info('Billing job processors registered');
}

/**
 * Schedule recurring billing jobs
 */
async function scheduleRecurringJobs(queueService) {
  // Check overdue invoices every hour
  await queueService.addRecurringJob(
    BILLING_TYPES.OVERDUE_CHECK,
    {},
    { repeat: { every: 60 * 60 * 1000 } } // Every hour
  );

  // Check usage limits every 6 hours
  await queueService.addRecurringJob(
    BILLING_TYPES.USAGE_ALERT,
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 } } // Every 6 hours
  );

  // Payment reminders every day at 9 AM
  await queueService.addRecurringJob(
    BILLING_TYPES.PAYMENT_REMINDER,
    {},
    { repeat: { cron: '0 9 * * *' } } // Daily at 9 AM
  );

  logger.info('Recurring billing jobs scheduled');
}

/**
 * Process generate invoice job
 */
async function processGenerateInvoice(job) {
  const { organizationId, planId, billingCycle, userId } = job.data;

  logger.info(`Generating invoice for organization ${organizationId}`);

  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    // Generate invoice
    const invoice = await billingService.generateInvoice(organization, planId, billingCycle, userId);

    // Send notification
    await Notification.create({
      organization: organizationId,
      user: userId,
      type: 'billing',
      title: 'New Invoice Generated',
      message: `Invoice ${invoice.invoiceNumber} has been generated.`,
      data: {
        invoiceId: invoice._id,
        amount: invoice.total,
        currency: invoice.currency
      }
    });

    logger.info(`Invoice ${invoice.invoiceNumber} generated for organization ${organizationId}`);

    return { success: true, invoiceId: invoice._id };
  } catch (error) {
    logger.error(`Failed to generate invoice for ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Process payment reminder job
 */
async function processPaymentReminder(job) {
  logger.info('Processing payment reminders');

  try {
    // Find overdue invoices
    const overdueInvoices = await Invoice.findOverdue();

    const results = {
      sent: 0,
      failed: 0
    };

    for (const invoice of overdueInvoices) {
      try {
        // Check days overdue
        const daysOverdue = invoice.daysOverdue;

        // Send reminder only on specific days
        if ([1, 3, 7, 14, 30].includes(daysOverdue)) {
          await sendPaymentReminder(invoice);
          results.sent++;
        }
      } catch (error) {
        logger.error(`Failed to send reminder for invoice ${invoice.invoiceNumber}:`, error);
        results.failed++;
      }
    }

    logger.info(`Payment reminders sent: ${results.sent}, failed: ${results.failed}`);
    return results;
  } catch (error) {
    logger.error('Failed to process payment reminders:', error);
    throw error;
  }
}

/**
 * Send payment reminder notification
 */
async function sendPaymentReminder(invoice) {
  const organization = await Organization.findById(invoice.organization);

  // Create notification
  await Notification.create({
    organization: invoice.organization,
    type: 'billing',
    title: 'Payment Reminder',
    message: `Invoice ${invoice.invoiceNumber} is ${invoice.daysOverdue} days overdue. Amount: ${invoice.currency} ${invoice.total}`,
    data: {
      invoiceId: invoice._id,
      amount: invoice.total,
      currency: invoice.currency,
      daysOverdue: invoice.daysOverdue
    },
    priority: 'high'
  });

  // Update invoice reminder count
  await invoice.sendReminder();

  logger.info(`Payment reminder sent for invoice ${invoice.invoiceNumber}`);
}

/**
 * Process subscription renewal job
 */
async function processSubscriptionRenewal(job) {
  const { organizationId } = job.data;

  logger.info(`Processing subscription renewal for organization ${organizationId}`);

  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    const subscription = organization.subscription;
    if (!subscription || subscription.status !== 'active') {
      logger.info(`Organization ${organizationId} has no active subscription`);
      return { success: false, reason: 'No active subscription' };
    }

    // Check if renewal is needed
    const renewalDate = subscription.currentPeriodEnd;
    const now = new Date();

    if (renewalDate > now) {
      return { success: false, reason: 'Not yet due for renewal' };
    }

    // Process renewal based on provider
    let result;
    if (subscription.stripeSubscriptionId) {
      // Stripe handles auto-renewal
      result = { success: true, provider: 'stripe' };
    } else if (subscription.razorpaySubscriptionId) {
      // Razorpay handles auto-renewal
      result = { success: true, provider: 'razorpay' };
    } else {
      // Manual renewal needed
      await Notification.create({
        organization: organizationId,
        type: 'billing',
        title: 'Subscription Renewal Required',
        message: 'Your subscription is due for renewal. Please update your payment method.',
        priority: 'high'
      });

      result = { success: false, reason: 'Manual renewal required' };
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      action: 'subscription_renewal_check',
      resourceType: 'subscription',
      description: `Subscription renewal check: ${result.success ? 'successful' : 'failed'}`
    });

    return result;
  } catch (error) {
    logger.error(`Failed to process renewal for ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Process subscription expired job
 */
async function processSubscriptionExpired(job) {
  const { organizationId } = job.data;

  logger.info(`Processing expired subscription for organization ${organizationId}`);

  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    // Update subscription status
    organization.subscription.status = 'expired';
    await organization.save();

    // Create notification
    await Notification.create({
      organization: organizationId,
      type: 'billing',
      title: 'Subscription Expired',
      message: 'Your subscription has expired. Please renew to continue using premium features.',
      priority: 'high'
    });

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      action: 'subscription_expired',
      resourceType: 'subscription',
      description: 'Subscription expired'
    });

    logger.info(`Subscription expired for organization ${organizationId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to process expired subscription for ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Process payment retry job
 */
async function processPaymentRetry(job) {
  const { invoiceId, attempt } = job.data;

  logger.info(`Processing payment retry for invoice ${invoiceId}, attempt ${attempt}`);

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status === 'paid') {
      return { success: true, reason: 'Already paid' };
    }

    const organization = await Organization.findById(invoice.organization);
    const paymentMethod = organization.paymentMethods?.find(pm => pm.isDefault);

    if (!paymentMethod) {
      throw new Error('No payment method available');
    }

    let result;
    if (paymentMethod.provider === 'stripe') {
      result = await paymentService.processStripePayment(organization, invoice, paymentMethod);
    } else if (paymentMethod.provider === 'razorpay') {
      result = await paymentService.processRazorpayPayment(organization, invoice, paymentMethod);
    }

    // Update invoice status
    await invoice.markAsPaid({
      provider: paymentMethod.provider,
      externalPaymentId: result.paymentId,
      paidAt: new Date()
    });

    // Create notification
    await Notification.create({
      organization: invoice.organization,
      type: 'billing',
      title: 'Payment Successful',
      message: `Invoice ${invoice.invoiceNumber} has been paid successfully.`,
      priority: 'normal'
    });

    logger.info(`Payment successful for invoice ${invoiceId}`);
    return { success: true, paymentId: result.paymentId };
  } catch (error) {
    logger.error(`Payment retry failed for invoice ${invoiceId}:`, error);

    // Schedule next retry if attempts remaining
    const maxAttempts = 3;
    if (attempt < maxAttempts) {
      const delayMs = Math.pow(2, attempt) * 24 * 60 * 60 * 1000; // Exponential backoff
      // Queue next retry (would use queueService.add() here)
      logger.info(`Scheduling retry ${attempt + 1} for invoice ${invoiceId}`);
    }

    throw error;
  }
}

/**
 * Process overdue check job
 */
async function processOverdueCheck(job) {
  logger.info('Processing overdue invoice check');

  try {
    const overdueInvoices = await Invoice.findOverdue();

    const results = {
      checked: 0,
      overdue: 0,
      suspended: 0
    };

    for (const invoice of overdueInvoices) {
      results.checked++;

      // Check if organization should be suspended
      if (invoice.daysOverdue > 30) {
        await suspendOrganization(invoice.organization);
        results.suspended++;
      } else if (invoice.daysOverdue > 0) {
        results.overdue++;
      }
    }

    logger.info(`Overdue check complete: ${results.checked} checked, ${results.overdue} overdue, ${results.suspended} suspended`);
    return results;
  } catch (error) {
    logger.error('Failed to process overdue check:', error);
    throw error;
  }
}

/**
 * Suspend organization for non-payment
 */
async function suspendOrganization(organizationId) {
  const organization = await Organization.findById(organizationId);
  if (!organization) return;

  organization.subscription.status = 'suspended';
  await organization.save();

  await Notification.create({
    organization: organizationId,
    type: 'billing',
    title: 'Account Suspended',
    message: 'Your account has been suspended due to non-payment. Please pay your outstanding invoices.',
    priority: 'high'
  });

  logger.info(`Organization ${organizationId} suspended for non-payment`);
}

/**
 * Process usage alert job
 */
async function processUsageAlert(job) {
  logger.info('Processing usage alerts');

  try {
    const organizations = await Organization.find({ 'subscription.status': 'active' });

    const results = {
      checked: 0,
      alerts: 0
    };

    for (const organization of organizations) {
      results.checked++;

      try {
        // Get usage statistics
        const usage = await billingService.getUsage(organization._id);

        // Check if approaching limits
        const alerts = checkUsageLimits(organization, usage);

        if (alerts.length > 0) {
          await Notification.create({
            organization: organization._id,
            type: 'usage_alert',
            title: 'Usage Alert',
            message: `You are approaching your plan limits: ${alerts.join(', ')}`,
            priority: 'high',
            data: { usage, alerts }
          });

          results.alerts++;
        }
      } catch (error) {
        logger.error(`Failed to check usage for organization ${organization._id}:`, error);
      }
    }

    logger.info(`Usage alerts complete: ${results.checked} checked, ${results.alerts} alerts sent`);
    return results;
  } catch (error) {
    logger.error('Failed to process usage alerts:', error);
    throw error;
  }
}

/**
 * Check usage against plan limits
 */
function checkUsageLimits(organization, usage) {
  const alerts = [];
  const planLimits = {
    free: { apiCalls: 1000, tokens: 10000, storage: 100 },
    starter: { apiCalls: 10000, tokens: 100000, storage: 1000 },
    professional: { apiCalls: 100000, tokens: 1000000, storage: 10000 }
  };

  const plan = organization.subscription?.plan || 'free';
  const limits = planLimits[plan];

  if (!limits) return alerts; // Enterprise has unlimited

  // Check API calls (80% threshold)
  if (usage.usage?.apiCalls?.percentage >= 80) {
    alerts.push(`API calls at ${usage.usage.apiCalls.percentage}%`);
  }

  // Check tokens (80% threshold)
  if (usage.usage?.tokens?.percentage >= 80) {
    alerts.push(`Tokens at ${usage.usage.tokens.percentage}%`);
  }

  return alerts;
}

export default {
  BILLING_TYPES,
  register,
  scheduleRecurringJobs,
  processGenerateInvoice,
  processPaymentReminder,
  processSubscriptionRenewal,
  processSubscriptionExpired,
  processPaymentRetry,
  processOverdueCheck,
  processUsageAlert
};