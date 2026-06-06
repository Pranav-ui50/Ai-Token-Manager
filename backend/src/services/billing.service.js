/**
 * Billing Service
 *
 * Handles organization billing operations including:
 * - Subscription management
 * - Payment processing (Stripe & Razorpay)
 * - Invoice generation
 * - Usage tracking
 */

import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

// Payment provider instances (lazy loaded)
let stripe = null;
let razorpay = null;

// Initialize payment providers
const initPaymentProviders = async () => {
  // Initialize Stripe
  if (process.env.STRIPE_SECRET_KEY && !stripe) {
    try {
      const Stripe = (await import('stripe')).default;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      logger.info('Stripe payment provider initialized');
    } catch (error) {
      logger.warn('Stripe initialization failed:', error.message);
    }
  }

  // Initialize Razorpay
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && !razorpay) {
    try {
      const Razorpay = (await import('razorpay')).default;
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      logger.info('Razorpay payment provider initialized');
    } catch (error) {
      logger.warn('Razorpay initialization failed:', error.message);
    }
  }
};

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    features: {
      maxProjects: 1,
      maxFeatures: 5,
      maxSimulations: 10,
      maxTeamMembers: 1,
      apiCalls: 1000,
      tokens: 10000,
      storage: 100, // MB
      reports: 'basic',
      support: 'community'
    },
    limits: {
      features: ['basic_analytics', 'single_provider'],
      notIncluded: ['advanced_simulations', 'priority_support', 'custom_reports']
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    displayName: 'Starter Plan',
    price: 29,
    currency: 'USD',
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    razorpayPlanId: process.env.RAZORPAY_STARTER_PLAN_ID,
    billingCycle: ['monthly', 'yearly'],
    yearlyDiscount: 0.2, // 20% discount
    features: {
      maxProjects: 5,
      maxFeatures: 20,
      maxSimulations: 100,
      maxTeamMembers: 5,
      apiCalls: 10000,
      tokens: 100000,
      storage: 1000, // MB
      reports: 'standard',
      support: 'email'
    },
    limits: {
      features: ['basic_analytics', 'multiple_providers', 'export_reports']
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    displayName: 'Professional Plan',
    price: 99,
    currency: 'USD',
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    razorpayPlanId: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID,
    billingCycle: ['monthly', 'yearly'],
    yearlyDiscount: 0.2,
    features: {
      maxProjects: 20,
      maxFeatures: 100,
      maxSimulations: 1000,
      maxTeamMembers: 25,
      apiCalls: 100000,
      tokens: 1000000,
      storage: 10000, // MB
      reports: 'advanced',
      support: 'priority'
    },
    limits: {
      features: ['all_starter', 'advanced_simulations', 'custom_reports', 'api_access']
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise Plan',
    price: 'custom',
    currency: 'USD',
    billingCycle: ['monthly', 'yearly'],
    features: {
      maxProjects: 'unlimited',
      maxFeatures: 'unlimited',
      maxSimulations: 'unlimited',
      maxTeamMembers: 'unlimited',
      apiCalls: 'unlimited',
      tokens: 'unlimited',
      storage: 'unlimited',
      reports: 'custom',
      support: 'dedicated'
    },
    limits: {
      features: ['all_features', 'custom_integrations', 'sla', 'dedicated_support']
    }
  }
};

class BillingService {
  constructor() {
    // Initialize payment providers on first use
    this._providersInitialized = false;
  }

  /**
   * Ensure payment providers are initialized
   */
  async ensureProvidersInitialized() {
    if (!this._providersInitialized) {
      await initPaymentProviders();
      this._providersInitialized = true;
    }
  }

  /**
   * Get billing information for organization
   */
  async getBilling(organizationId) {
    const organization = await Organization.findById(organizationId)
      .populate('owner', 'firstName lastName email');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const subscription = organization.subscription || {};
    const planKey = (subscription.plan || 'free').toLowerCase();
    const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;

    return {
      organization: {
        id: organization._id,
        name: organization.name
      },
      subscription: {
        plan: subscription.plan || 'free',
        status: subscription.status || 'trial',
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingCycle: subscription.billingCycle || 'monthly',
        cancelledAt: subscription.cancelledAt,
        cancelReason: subscription.cancelReason
      },
      plan: {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        features: plan.features,
        price: plan.price === 'custom' ? 'Contact Sales' : plan.price,
        currency: plan.currency
      },
      billingDetails: organization.billingDetails || {},
      paymentMethods: (organization.paymentMethods || []).map(pm => ({
        id: pm.id,
        type: pm.type,
        last4: pm.last4,
        brand: pm.brand,
        expiryMonth: pm.expiryMonth,
        expiryYear: pm.expiryYear,
        isDefault: pm.isDefault,
        addedAt: pm.addedAt
      }))
    };
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(organizationId, plan, billingCycle, userId) {
    await this.ensureProvidersInitialized();

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Validate plan
    if (!SUBSCRIPTION_PLANS[plan]) {
      throw new AppError('Invalid subscription plan', 400, 'INVALID_PLAN');
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];
    const oldPlan = organization.subscription?.plan || 'free';

    // Handle enterprise plan
    if (planConfig.price === 'custom') {
      throw new AppError('Please contact sales for enterprise pricing', 400, 'CONTACT_SALES');
    }

    // Validate billing cycle
    if (planConfig.billingCycle !== 'monthly' && !planConfig.billingCycle.includes(billingCycle)) {
      throw new AppError('Invalid billing cycle for this plan', 400, 'INVALID_BILLING_CYCLE');
    }

    // Calculate price
    let price = planConfig.price;
    if (billingCycle === 'yearly' && planConfig.yearlyDiscount) {
      price = price * 12 * (1 - planConfig.yearlyDiscount);
    }

    // Process payment for paid plans
    if (planConfig.price > 0) {
      // Check for payment method
      const defaultPaymentMethod = organization.paymentMethods?.find(pm => pm.isDefault);
      if (!defaultPaymentMethod) {
        throw new AppError('Please add a payment method before upgrading', 400, 'PAYMENT_METHOD_REQUIRED');
      }

      // Process payment based on provider
      try {
        if (defaultPaymentMethod.provider === 'stripe' && stripe) {
          await this.processStripePayment(organization, planConfig, billingCycle, defaultPaymentMethod);
        } else if (defaultPaymentMethod.provider === 'razorpay' && razorpay) {
          await this.processRazorpayPayment(organization, planConfig, billingCycle, defaultPaymentMethod);
        }
      } catch (paymentError) {
        logger.error('Payment processing failed:', paymentError);
        throw new AppError(`Payment failed: ${paymentError.message}`, 400, 'PAYMENT_FAILED');
      }
    }

    // Calculate billing period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update subscription
    organization.subscription = {
      plan,
      status: 'active',
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date()
    };

    await organization.save();

    // Generate invoice for paid plans
    if (planConfig.price > 0) {
      await this.generateInvoice(organization, planConfig, billingCycle, userId);
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'subscription_updated',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Subscription updated from ${oldPlan} to ${plan} (${billingCycle})`,
      beforeState: { plan: oldPlan },
      afterState: { plan, billingCycle }
    });

    logger.info(`Subscription updated: ${organizationId} to ${plan} (${billingCycle}) by ${userId}`);

    return {
      subscription: organization.subscription,
      plan: {
        id: planConfig.id,
        name: planConfig.name,
        displayName: planConfig.displayName,
        price: planConfig.price,
        currency: planConfig.currency
      }
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId, reason, userId) {
    await this.ensureProvidersInitialized();

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.subscription || organization.subscription.plan === 'free') {
      throw new AppError('No active subscription to cancel', 400, 'NO_SUBSCRIPTION');
    }

    if (organization.subscription.status === 'cancelled') {
      throw new AppError('Subscription is already cancelled', 400, 'ALREADY_CANCELLED');
    }

    // Cancel with external payment provider
    if (organization.subscription.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(organization.subscription.stripeSubscriptionId, {
          prorate: true
        });
      } catch (err) {
        logger.warn('Stripe cancellation failed:', err.message);
      }
    }

    if (organization.subscription.razorpaySubscriptionId && razorpay) {
      try {
        await razorpay.subscriptions.cancel(organization.subscription.razorpaySubscriptionId);
      } catch (err) {
        logger.warn('Razorpay cancellation failed:', err.message);
      }
    }

    // Update subscription status
    organization.subscription.status = 'cancelled';
    organization.subscription.cancelReason = reason;
    organization.subscription.cancelledAt = new Date();
    organization.subscription.cancelledBy = userId;

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'subscription_cancelled',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Subscription cancelled. Reason: ${reason || 'Not specified'}`
    });

    logger.info(`Subscription cancelled: ${organizationId} by ${userId}. Reason: ${reason}`);

    return {
      status: 'cancelled',
      cancelledAt: organization.subscription.cancelledAt,
      accessUntil: organization.subscription.currentPeriodEnd,
      message: 'Subscription cancelled. You will have access until the end of your billing period.'
    };
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(organizationId, userId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (organization.subscription?.status !== 'cancelled') {
      throw new AppError('Subscription is not cancelled', 400, 'NOT_CANCELLED');
    }

    // Check if within current period
    if (organization.subscription.currentPeriodEnd && new Date() > organization.subscription.currentPeriodEnd) {
      throw new AppError('Subscription period has expired. Please start a new subscription.', 400, 'EXPIRED');
    }

    organization.subscription.status = 'active';
    organization.subscription.cancelReason = undefined;
    organization.subscription.cancelledAt = undefined;
    organization.subscription.cancelledBy = undefined;
    organization.subscription.reactivatedAt = new Date();
    organization.subscription.reactivatedBy = userId;

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'subscription_reactivated',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: 'Subscription reactivated'
    });

    logger.info(`Subscription reactivated: ${organizationId} by ${userId}`);

    const planKey = (organization.subscription.plan || 'free').toLowerCase();
    return {
      status: 'active',
      plan: SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free,
      message: 'Subscription reactivated successfully'
    };
  }

  /**
   * Get usage summary
   */
  async getUsage(organizationId, startDate, endDate) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Calculate usage from features, projects, etc.
    const Project = (await import('../models/Project.js')).default;
    const Feature = (await import('../models/Feature.js')).default;
    const Simulation = (await import('../models/Simulation.js')).default;

    const periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = endDate ? new Date(endDate) : new Date();

    // Get counts
    const [projectCount, featureCount, simulationCount] = await Promise.all([
      Project.countDocuments({ organization: organizationId, isActive: true }),
      Feature.countDocuments({ organization: organizationId, isActive: true }),
      Simulation.countDocuments({ organization: organizationId })
    ]);

    // Get feature usage stats
    const featureUsage = await Feature.aggregate([
      {
        $match: {
          organization: mongoose.Types.ObjectId.createFromHexString(organizationId)
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$stats.totalRequests' },
          totalTokens: { $sum: '$stats.totalTokens' },
          totalCost: { $sum: '$stats.totalCost' }
        }
      }
    ]);

    const usage = featureUsage[0] || { totalRequests: 0, totalTokens: 0, totalCost: 0 };

    // Normalize plan name to lowercase for lookup
    const planKey = (organization.subscription?.plan || 'free').toLowerCase();
    const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;

    return {
      period: {
        start: periodStart,
        end: periodEnd
      },
      usage: {
        projects: {
          used: projectCount,
          limit: plan.features.maxProjects,
          percentage: plan.features.maxProjects === 'unlimited' ? 0 : Math.round((projectCount / plan.features.maxProjects) * 100)
        },
        features: {
          used: featureCount,
          limit: plan.features.maxFeatures,
          percentage: plan.features.maxFeatures === 'unlimited' ? 0 : Math.round((featureCount / plan.features.maxFeatures) * 100)
        },
        simulations: {
          used: simulationCount,
          limit: plan.features.maxSimulations,
          percentage: plan.features.maxSimulations === 'unlimited' ? 0 : Math.round((simulationCount / plan.features.maxSimulations) * 100)
        },
        teamMembers: {
          used: organization.members?.length || 0,
          limit: plan.features.maxTeamMembers,
          percentage: plan.features.maxTeamMembers === 'unlimited' ? 0 : Math.round(((organization.members?.length || 0) / plan.features.maxTeamMembers) * 100)
        },
        apiCalls: {
          used: usage.totalRequests,
          limit: plan.features.apiCalls,
          percentage: plan.features.apiCalls === 'unlimited' ? 0 : Math.round((usage.totalRequests / plan.features.apiCalls) * 100)
        },
        tokens: {
          used: usage.totalTokens,
          limit: plan.features.tokens,
          percentage: plan.features.tokens === 'unlimited' ? 0 : Math.round((usage.totalTokens / plan.features.tokens) * 100)
        }
      },
      cost: {
        total: usage.totalCost,
        currency: 'USD'
      },
      plan: {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName
      }
    };
  }

  /**
   * Get invoices
   */
  async getInvoices(organizationId, page = 1, limit = 10) {
    const invoices = await Invoice.findByOrganization(organizationId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    });

    const total = await Invoice.countDocuments({ organization: organizationId });

    return {
      invoices: invoices.map(inv => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        amount: inv.total,
        currency: inv.currency,
        status: inv.status,
        paidAt: inv.payment?.paidAt,
        dueDate: inv.dueDate,
        periodStart: inv.billingPeriod?.start,
        periodEnd: inv.billingPeriod?.end,
        plan: inv.subscription?.planName,
        billingCycle: inv.subscription?.billingCycle,
        createdAt: inv.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(organizationId, invoiceId) {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId
    }).populate('createdBy', 'firstName lastName email');

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }

    return {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      externalInvoiceId: invoice.externalInvoiceId,
      type: invoice.type,
      status: invoice.status,
      items: invoice.items,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      billingPeriod: invoice.billingPeriod,
      dueDate: invoice.dueDate,
      payment: invoice.payment,
      subscription: invoice.subscription,
      usage: invoice.usage,
      billingAddress: invoice.billingAddress,
      notes: invoice.notes,
      daysOverdue: invoice.daysOverdue,
      isOverdue: invoice.isOverdue,
      createdAt: invoice.createdAt,
      createdBy: invoice.createdBy
    };
  }

  /**
   * Download invoice
   */
  async downloadInvoice(organizationId, invoiceId, format) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    if (format === 'json') {
      const content = JSON.stringify(invoice, null, 2);
      return {
        data: content,
        contentType: 'application/json',
        filename: `invoice-${invoice.invoiceNumber}.json`
      };
    }

    if (format === 'pdf') {
      return await this.generateInvoicePDF(invoice);
    }

    // Generate Excel file (default)
    return await this.generateInvoiceExcel(invoice);
  }

  /**
   * Generate PDF invoice
   */
  async generateInvoicePDF(invoice) {
    // Use PDFKit for PDF generation
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Buffer to store PDF
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Header
    doc.fontSize(28).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    // Company info (left side)
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'left' });
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`);
    doc.text(`Status: ${invoice.status.toUpperCase()}`);
    doc.moveDown(1);

    // Billing address (right-aligned box)
    if (invoice.billingAddress) {
      doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', { underline: true });
      doc.fontSize(10).font('Helvetica');
      if (invoice.billingAddress.companyName) {
        doc.text(invoice.billingAddress.companyName);
      }
      if (invoice.billingAddress.address) {
        doc.text(invoice.billingAddress.address);
      }
      if (invoice.billingAddress.city) {
        doc.text(`${invoice.billingAddress.city}, ${invoice.billingAddress.state || ''} ${invoice.billingAddress.postalCode || ''}`);
      }
      if (invoice.billingAddress.country) {
        doc.text(invoice.billingAddress.country);
      }
      if (invoice.billingAddress.taxId) {
        doc.text(`Tax ID: ${invoice.billingAddress.taxId}`);
      }
    }
    doc.moveDown(2);

    // Line items table
    const tableTop = doc.y;
    const colWidths = [250, 80, 100, 100]; // Description, Qty, Unit Price, Amount
    const startX = 50;

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', startX, tableTop);
    doc.text('Quantity', startX + colWidths[0], tableTop);
    doc.text('Unit Price', startX + colWidths[0] + colWidths[1], tableTop);
    doc.text('Amount', startX + colWidths[0] + colWidths[1] + colWidths[2], tableTop);

    // Draw line under header
    doc.moveTo(startX, tableTop + 15);
    doc.lineTo(startX + colWidths.reduce((a, b) => a + b, 0), tableTop + 15);
    doc.stroke();

    // Table rows
    let y = tableTop + 25;
    doc.fontSize(9).font('Helvetica');

    for (const item of invoice.items) {
      doc.text(item.description.substring(0, 40), startX, y);
      doc.text(item.quantity.toString(), startX + colWidths[0], y);
      doc.text(`${invoice.currency} ${item.unitPrice.toFixed(2)}`, startX + colWidths[0] + colWidths[1], y);
      doc.text(`${invoice.currency} ${item.amount.toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y);
      y += 20;
    }

    // Draw line after items
    doc.moveTo(startX, y);
    doc.lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y);
    doc.stroke();
    y += 15;

    // Totals section
    const totalsX = startX + colWidths[0] + colWidths[1];

    doc.fontSize(10);
    doc.text('Subtotal:', totalsX, y);
    doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, totalsX + colWidths[2], y);

    y += 15;
    if (invoice.discount > 0) {
      doc.text('Discount:', totalsX, y);
      doc.text(`-${invoice.currency} ${invoice.discount.toFixed(2)}`, totalsX + colWidths[2], y);
      y += 15;
    }

    if (invoice.tax > 0) {
      doc.text(`Tax${invoice.taxRate ? ` (${invoice.taxRate}%)` : ''}:`, totalsX, y);
      doc.text(`${invoice.currency} ${invoice.tax.toFixed(2)}`, totalsX + colWidths[2], y);
      y += 15;
    }

    // Total line
    doc.moveTo(totalsX, y);
    doc.lineTo(totalsX + colWidths[2] + colWidths[3], y);
    doc.stroke();
    y += 10;

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', totalsX, y);
    doc.text(`${invoice.currency} ${invoice.total.toFixed(2)}`, totalsX + colWidths[2], y);

    // Footer
    doc.fontSize(8).font('Helvetica');
    doc.moveDown(3);
    doc.text('Thank you for your business!', { align: 'center' });
    doc.text('Payment is due within 30 days. Please include the invoice number on your payment.', { align: 'center' });

    // Finalize PDF
    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          data: buffer,
          contentType: 'application/pdf',
          filename: `invoice-${invoice.invoiceNumber}.pdf`
        });
      });
      doc.end();
    });
  }

  /**
   * Generate Excel invoice
   */
  async generateInvoiceExcel(invoice) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');

    // Add invoice header
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'INVOICE';
    worksheet.getCell('A1').font = { size: 24, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow(['Invoice Number:', invoice.invoiceNumber]);
    worksheet.addRow(['Date:', new Date(invoice.createdAt).toLocaleDateString()]);
    worksheet.addRow(['Due Date:', invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A']);
    worksheet.addRow(['Status:', invoice.status.toUpperCase()]);
    worksheet.addRow([]);

    // Add billing address
    if (invoice.billingAddress) {
      worksheet.addRow(['Bill To:']);
      if (invoice.billingAddress.companyName) {
        worksheet.addRow([invoice.billingAddress.companyName]);
      }
      if (invoice.billingAddress.address) {
        worksheet.addRow([invoice.billingAddress.address]);
      }
      if (invoice.billingAddress.city) {
        worksheet.addRow([
          `${invoice.billingAddress.city}, ${invoice.billingAddress.state || ''} ${invoice.billingAddress.postalCode || ''}`
        ]);
      }
      worksheet.addRow([]);
    }

    // Add line items header
    worksheet.addRow(['Description', 'Quantity', 'Unit Price', 'Amount']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    // Add line items
    invoice.items.forEach(item => {
      worksheet.addRow([
        item.description,
        item.quantity,
        `${invoice.currency} ${item.unitPrice.toFixed(2)}`,
        `${invoice.currency} ${item.amount.toFixed(2)}`
      ]);
    });

    worksheet.addRow([]);
    worksheet.addRow(['', '', 'Subtotal:', `${invoice.currency} ${invoice.subtotal.toFixed(2)}`]);
    if (invoice.discount > 0) {
      worksheet.addRow(['', '', 'Discount:', `-${invoice.currency} ${invoice.discount.toFixed(2)}`]);
    }
    if (invoice.tax > 0) {
      worksheet.addRow(['', '', 'Tax:', `${invoice.currency} ${invoice.tax.toFixed(2)}`]);
    }
    worksheet.addRow(['', '', 'Total:', `${invoice.currency} ${invoice.total.toFixed(2)}`]).font = { bold: true };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `invoice-${invoice.invoiceNumber}.xlsx`
    };
  }

  /**
   * Update billing details
   */
  async updateBillingDetails(organizationId, billingDetails, userId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Validate billing details
    const allowedFields = ['companyName', 'address', 'city', 'state', 'country', 'postalCode', 'taxId', 'vatNumber'];
    const sanitizedDetails = {};

    for (const field of allowedFields) {
      if (billingDetails[field] !== undefined) {
        sanitizedDetails[field] = billingDetails[field];
      }
    }

    organization.billingDetails = {
      ...organization.billingDetails?.toObject(),
      ...sanitizedDetails
    };

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'billing_details_updated',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: 'Billing details updated'
    });

    logger.info(`Billing details updated: ${organizationId}`);

    return organization.billingDetails;
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(organizationId, paymentMethod, userId) {
    await this.ensureProvidersInitialized();

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const { type = 'card', last4, brand, expiryMonth, expiryYear, externalId, provider = 'stripe' } = paymentMethod;

    // Validate required fields
    if (!last4 || !/^\d{4}$/.test(last4)) {
      throw new AppError('Valid last 4 digits required', 400, 'INVALID_LAST4');
    }

    if (!organization.paymentMethods) {
      organization.paymentMethods = [];
    }

    // Create payment method with Stripe if provider is stripe
    let stripePaymentMethodId = externalId;
    if (provider === 'stripe' && stripe && !externalId) {
      // In production, frontend would send payment method from Stripe.js
      // For now, store a reference
      stripePaymentMethodId = `pm_mock_${Date.now()}`;
    }

    const newMethod = {
      id: new mongoose.Types.ObjectId().toString(),
      type,
      last4,
      brand: brand || 'other',
      expiryMonth,
      expiryYear,
      externalId: stripePaymentMethodId,
      provider,
      isDefault: organization.paymentMethods.length === 0,
      addedAt: new Date()
    };

    organization.paymentMethods.push(newMethod);
    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'payment_method_added',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Payment method added: ${brand || 'Card'} ending in ${last4}`
    });

    logger.info(`Payment method added: ${organizationId}`);

    return {
      id: newMethod.id,
      type: newMethod.type,
      last4: newMethod.last4,
      brand: newMethod.brand,
      expiryMonth: newMethod.expiryMonth,
      expiryYear: newMethod.expiryYear,
      isDefault: newMethod.isDefault,
      addedAt: newMethod.addedAt
    };
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(organizationId, methodId, userId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const methodIndex = organization.paymentMethods?.findIndex(m => m.id === methodId);
    if (methodIndex === -1 || methodIndex === undefined) {
      throw new AppError('Payment method not found', 404, 'NOT_FOUND');
    }

    const method = organization.paymentMethods[methodIndex];

    // Cannot remove if it's the only payment method on a paid plan
    if (organization.paymentMethods.length === 1 && organization.subscription?.plan !== 'free') {
      throw new AppError('Cannot remove the only payment method on a paid plan', 400, 'LAST_PAYMENT_METHOD');
    }

    // If removing default, set another as default
    if (method.isDefault && organization.paymentMethods.length > 1) {
      const nextMethod = organization.paymentMethods.find(m => m.id !== methodId);
      if (nextMethod) {
        nextMethod.isDefault = true;
      }
    }

    organization.paymentMethods.splice(methodIndex, 1);
    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'payment_method_removed',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Payment method removed: ${method.brand} ending in ${method.last4}`
    });

    logger.info(`Payment method removed: ${organizationId}, method: ${methodId}`);

    return { success: true, message: 'Payment method removed successfully' };
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(organizationId, methodId, userId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const method = organization.paymentMethods?.find(m => m.id === methodId);
    if (!method) {
      throw new AppError('Payment method not found', 404, 'NOT_FOUND');
    }

    // Remove default from all methods
    organization.paymentMethods.forEach(m => {
      m.isDefault = false;
    });

    // Set the selected method as default
    method.isDefault = true;
    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'payment_method_default_changed',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: `Default payment method changed to: ${method.brand} ending in ${method.last4}`
    });

    logger.info(`Default payment method changed: ${organizationId}`);

    return {
      id: method.id,
      isDefault: true
    };
  }

  /**
   * Get available plans
   */
  async getAvailablePlans() {
    return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      displayName: plan.displayName,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      yearlyDiscount: plan.yearlyDiscount,
      features: plan.features,
      limits: plan.limits
    }));
  }

  /**
   * Preview subscription change
   */
  async previewSubscriptionChange(organizationId, plan, billingCycle) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    const currentPlanKey = (organization.subscription?.plan || 'free').toLowerCase();
    const currentPlan = SUBSCRIPTION_PLANS[currentPlanKey] || SUBSCRIPTION_PLANS.free;
    const newPlanKey = plan.toLowerCase();
    const newPlan = SUBSCRIPTION_PLANS[newPlanKey];

    if (!newPlan) {
      throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
    }

    if (newPlan.price === 'custom') {
      return {
        currentPlan: {
          id: organization.subscription?.plan || 'free',
          name: currentPlan.name,
          price: currentPlan.price
        },
        newPlan: {
          id: plan,
          name: newPlan.name,
          price: 'Contact Sales'
        },
        message: 'Please contact sales for enterprise pricing'
      };
    }

    // Calculate prorated amounts
    const now = new Date();
    const currentPeriodEnd = organization.subscription?.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd - now) / (24 * 60 * 60 * 1000)));
    const daysInPeriod = organization.subscription?.billingCycle === 'yearly' ? 365 : 30;

    let newPrice = typeof newPlan.price === 'number' ? newPlan.price : 0;
    if (billingCycle === 'yearly' && newPlan.yearlyDiscount) {
      newPrice = newPrice * 12 * (1 - newPlan.yearlyDiscount);
    }

    let currentPrice = typeof currentPlan.price === 'number' ? currentPlan.price : 0;
    if (organization.subscription?.billingCycle === 'yearly' && currentPlan.yearlyDiscount) {
      currentPrice = currentPlan.price * 12 * (1 - currentPlan.yearlyDiscount);
    }

    // Calculate prorated credit/charge
    const proratedCredit = currentPrice > 0 ? (currentPrice / daysInPeriod) * daysRemaining : 0;
    const proratedCharge = newPrice > 0 ? (newPrice / (billingCycle === 'yearly' ? 365 : 30)) * daysRemaining : 0;
    const immediateCharge = Math.max(0, proratedCharge - proratedCredit);

    return {
      currentPlan: {
        id: organization.subscription?.plan || 'free',
        name: currentPlan.name,
        price: currentPrice,
        billingCycle: organization.subscription?.billingCycle || 'monthly'
      },
      newPlan: {
        id: plan,
        name: newPlan.name,
        price: newPrice,
        billingCycle
      },
      change: {
        priceDifference: newPrice - currentPrice,
        proratedCredit: proratedCredit.toFixed(2),
        proratedCharge: proratedCharge.toFixed(2),
        immediateCharge: immediateCharge.toFixed(2),
        currency: 'USD'
      },
      effectiveDate: now,
      nextBillingDate: billingCycle === 'yearly'
        ? new Date(now.setFullYear(now.getFullYear() + 1))
        : new Date(now.setMonth(now.getMonth() + 1)),
      features: {
        added: this.getAddedFeatures(currentPlan, newPlan),
        removed: this.getRemovedFeatures(currentPlan, newPlan)
      }
    };
  }

  // ==========================================
  // Payment Processing Methods
  // ==========================================

  /**
   * Process payment via Stripe
   */
  async processStripePayment(organization, plan, billingCycle, paymentMethod) {
    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'PAYMENT_PROVIDER_NOT_AVAILABLE');
    }

    const price = billingCycle === 'yearly' && plan.yearlyDiscount
      ? plan.price * 12 * (1 - plan.yearlyDiscount)
      : plan.price;

    // Create or get Stripe customer
    let stripeCustomerId = organization.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: organization.owner?.email,
        name: organization.name,
        metadata: {
          organizationId: organization._id.toString()
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // Convert to cents
      currency: plan.currency?.toLowerCase() || 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethod.externalId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        organizationId: organization._id.toString(),
        planId: plan.id,
        billingCycle
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Payment failed', 400, 'PAYMENT_FAILED');
    }

    // Update organization with Stripe customer ID
    organization.subscription = {
      ...organization.subscription?.toObject(),
      stripeCustomerId,
      stripePaymentIntentId: paymentIntent.id
    };

    return paymentIntent;
  }

  /**
   * Process payment via Razorpay
   */
  async processRazorpayPayment(organization, plan, billingCycle, paymentMethod) {
    if (!razorpay) {
      throw new AppError('Razorpay is not configured', 500, 'PAYMENT_PROVIDER_NOT_AVAILABLE');
    }

    const price = billingCycle === 'yearly' && plan.yearlyDiscount
      ? plan.price * 12 * (1 - plan.yearlyDiscount)
      : plan.price;
    const amountInPaise = Math.round(price * 100);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: plan.currency === 'USD' ? 'USD' : 'INR',
      receipt: `org_${organization._id}_${Date.now()}`,
      notes: {
        organizationId: organization._id.toString(),
        planId: plan.id,
        billingCycle
      }
    });

    // Update organization with order ID
    organization.subscription = {
      ...organization.subscription?.toObject(),
      razorpayOrderId: order.id
    };

    return order;
  }

  /**
   * Verify Razorpay payment
   */
  async verifyRazorpayPayment(organizationId, paymentData) {
    await this.ensureProvidersInitialized();

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentData;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Verify signature
    const crypto = await import('crypto');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new AppError('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      throw new AppError('Payment not captured', 400, 'PAYMENT_NOT_CAPTURED');
    }

    organization.subscription = {
      ...organization.subscription?.toObject(),
      razorpayPaymentId: razorpay_payment_id,
      status: 'active'
    };

    await organization.save();

    return { success: true, payment };
  }

  /**
   * Generate invoice for subscription
   */
  async generateInvoice(organization, plan, billingCycle, userId) {
    const invoiceNumber = await Invoice.generateInvoiceNumber(organization._id);

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const price = billingCycle === 'yearly' && plan.yearlyDiscount
      ? plan.price * 12 * (1 - plan.yearlyDiscount)
      : plan.price;

    const invoice = await Invoice.create({
      organization: organization._id,
      invoiceNumber,
      type: 'subscription',
      billingPeriod: {
        start: now,
        end: periodEnd
      },
      items: [{
        description: `${plan.displayName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        type: 'subscription',
        quantity: 1,
        unitPrice: price,
        amount: price
      }],
      subtotal: price,
      total: price,
      currency: plan.currency || 'USD',
      status: 'paid',
      dueDate: now,
      payment: {
        provider: organization.subscription?.stripeCustomerId ? 'stripe' : 'razorpay',
        externalCustomerId: organization.subscription?.stripeCustomerId || organization.subscription?.razorpayCustomerId,
        paidAt: now
      },
      subscription: {
        planId: plan.id,
        planName: plan.name,
        billingCycle
      },
      billingAddress: organization.billingDetails,
      createdBy: userId
    });

    logger.info(`Invoice generated: ${invoice.invoiceNumber} for organization ${organization._id}`);

    return invoice;
  }

  /**
   * Get added features when upgrading
   */
  getAddedFeatures(currentPlan, newPlan) {
    const currentFeatures = currentPlan.limits?.features || [];
    const newFeatures = newPlan.limits?.features || [];
    return newFeatures.filter(f => !currentFeatures.includes(f));
  }

  /**
   * Get removed features when downgrading
   */
  getRemovedFeatures(currentPlan, newPlan) {
    const currentFeatures = currentPlan.limits?.features || [];
    const newFeatures = newPlan.limits?.features || [];
    return currentFeatures.filter(f => !newFeatures.includes(f));
  }
}

export default new BillingService();