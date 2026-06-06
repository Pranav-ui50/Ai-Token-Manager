/**
 * Payment Service
 *
 * Comprehensive payment gateway integration for Stripe and Razorpay.
 * Handles checkout sessions, subscriptions, payment intents, and webhooks.
 */

import mongoose from 'mongoose';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import Organization from '../models/Organization.js';
import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';
import Plan from '../models/Plan.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

// Payment provider instances
let stripe = null;
let razorpay = null;

// Default subscription plans configuration (fallback if database plans not found)
const DEFAULT_SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    price: 0,
    yearlyPrice: 0,
    currency: 'USD',
    billingCycle: 'monthly'
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    displayName: 'Starter Plan',
    price: 29,
    yearlyPrice: 278.4, // 29 * 12 * 0.8 (20% discount)
    currency: 'USD',
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    razorpayPlanId: process.env.RAZORPAY_STARTER_PLAN_ID,
    billingCycle: ['monthly', 'yearly'],
    yearlyDiscount: 0.2
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    displayName: 'Professional Plan',
    price: 99,
    yearlyPrice: 950.4, // 99 * 12 * 0.8 (20% discount)
    currency: 'USD',
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    razorpayPlanId: process.env.RAZORPAY_PROFESSIONAL_PLAN_ID,
    billingCycle: ['monthly', 'yearly'],
    yearlyDiscount: 0.2
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise Plan',
    price: 'custom',
    currency: 'USD',
    billingCycle: ['monthly', 'yearly']
  }
};

class PaymentService {
  constructor() {
    this._providersInitialized = false;
  }

  /**
   * Get plan by ID or slug
   * @param {string} planId - Plan ID (MongoDB ObjectId) or slug
   * @returns {Object} Plan configuration
   */
  async getPlan(planId) {
    logger.info(`[PaymentService] Getting plan: ${planId}`);

    // First, try to find by MongoDB ObjectId
    if (/^[a-fA-F0-9]{24}$/.test(planId)) {
      try {
        const dbPlan = await Plan.findById(planId);
        if (dbPlan) {
          const monthlyPrice = dbPlan.billing?.price || 0;
          const yearlyDiscount = 0.2; // Default 20% yearly discount
          // Calculate yearly price if not explicitly set (12 months with 20% discount)
          const yearlyPrice = dbPlan.billing?.yearlyPrice || (monthlyPrice > 0 ? monthlyPrice * 12 * (1 - yearlyDiscount) : 0);

          logger.info(`[PaymentService] Found plan in database: ${dbPlan.name}, price: ${monthlyPrice}, yearlyPrice: ${yearlyPrice}`);
          return {
            id: dbPlan._id.toString(),
            name: dbPlan.name,
            displayName: dbPlan.displayName || dbPlan.name,
            slug: dbPlan.slug,
            price: monthlyPrice,
            yearlyPrice: yearlyPrice,
            currency: dbPlan.billing?.currency || 'USD',
            billingCycle: dbPlan.billing?.interval === 'year' ? 'yearly' : 'monthly',
            yearlyDiscount: yearlyDiscount,
            stripePriceId: dbPlan.stripePriceId,
            razorpayPlanId: dbPlan.razorpayPlanId,
            features: dbPlan.features || [],
            limits: dbPlan.limits || {},
            fromDatabase: true
          };
        } else {
          logger.warn(`[PaymentService] Plan not found in database: ${planId}`);
        }
      } catch (error) {
        logger.warn(`[PaymentService] Failed to fetch plan from database: ${error.message}`);
      }
    }

    // Fallback to default plans by slug
    const slug = planId.toLowerCase();
    if (DEFAULT_SUBSCRIPTION_PLANS[slug]) {
      logger.info(`[PaymentService] Using default plan: ${slug}`);
      return DEFAULT_SUBSCRIPTION_PLANS[slug];
    }

    // If not found, throw error
    logger.error(`[PaymentService] Plan not found: ${planId}`);
    throw new AppError(`Plan not found: ${planId}`, 400, 'PLAN_NOT_FOUND');
  }

  /**
   * Initialize payment providers
   */
  async ensureProvidersInitialized() {
    if (this._providersInitialized) return;

    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY && !stripe) {
      try {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16'
        });
        logger.info('Stripe payment provider initialized');
      } catch (error) {
        logger.error('Stripe initialization failed:', error.message);
        throw new AppError('Failed to initialize Stripe', 500, 'STRIPE_INIT_FAILED');
      }
    }

    // Initialize Razorpay
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && !razorpay) {
      try {
        razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        logger.info('Razorpay payment provider initialized');
      } catch (error) {
        logger.error('Razorpay initialization failed:', error.message);
        throw new AppError('Failed to initialize Razorpay', 500, 'RAZORPAY_INIT_FAILED');
      }
    }

    this._providersInitialized = true;
  }

  // ==========================================
  // STRIPE INTEGRATION
  // ==========================================

  /**
   * Create Stripe customer
   */
  async createStripeCustomer(organizationId, email, name, metadata = {}) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
        ...metadata
      }
    });

    logger.info(`Stripe customer created: ${customer.id} for organization ${organizationId}`);

    return customer;
  }

  /**
   * Get or create Stripe customer for organization
   */
  async getOrCreateStripeCustomer(organization) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    // Check if customer already exists
    if (organization.subscription?.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(organization.subscription.stripeCustomerId);
        return customer;
      } catch (error) {
        if (error.code !== 'resource_missing') {
          throw error;
        }
        // Customer doesn't exist, create new one
      }
    }

    // Create new customer
    const customer = await this.createStripeCustomer(
      organization._id.toString(),
      organization.owner?.email || `${organization.name}@example.com`,
      organization.name
    );

    // Update organization with Stripe customer ID
    organization.subscription = {
      ...organization.subscription?.toObject(),
      stripeCustomerId: customer.id
    };
    await organization.save();

    return customer;
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createStripeCheckoutSession(organizationId, planId, billingCycle, successUrl, cancelUrl) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const organization = await Organization.findById(organizationId).populate('owner');
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get plan from database or default
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
    }

    if (plan.price === 'custom' || plan.price === 0) {
      throw new AppError('Please contact sales for enterprise pricing', 400, 'CONTACT_SALES');
    }

    // Get or create customer
    const customer = await this.getOrCreateStripeCustomer(organization);

    // Calculate price
    let price = plan.price;
    if (billingCycle === 'yearly' && plan.yearlyPrice) {
      price = plan.yearlyPrice;
    } else if (billingCycle === 'yearly' && plan.yearlyDiscount) {
      price = plan.price * 12 * (1 - plan.yearlyDiscount);
    }

    // Create checkout session
    const sessionParams = {
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: plan.currency?.toLowerCase() || 'usd',
          unit_amount: Math.round(price * 100), // Convert to cents
          product_data: {
            name: plan.displayName,
            description: `${plan.displayName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`
          },
          recurring: {
            interval: billingCycle === 'yearly' ? 'year' : 'month'
          }
        },
        quantity: 1
      }],
      success_url: successUrl || `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/billing/cancel`,
      metadata: {
        organizationId: organization._id.toString(),
        planId,
        billingCycle
      },
      subscription_data: {
        metadata: {
          organizationId: organization._id.toString(),
          planId,
          billingCycle
        }
      }
    };

    // Add trial period for new customers
    if (!organization.subscription?.stripeSubscriptionId && planId !== 'free') {
      sessionParams.subscription_data.trial_period_days = 14;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info(`Stripe checkout session created: ${session.id} for organization ${organizationId}`);

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: organization.owner?._id,
      action: 'checkout_session_created',
      resourceType: 'payment',
      resourceId: session.id,
      resourceName: 'Stripe Checkout',
      description: `Stripe checkout session created for ${plan.displayName} (${billingCycle})`,
      metadata: {
        provider: 'stripe',
        planId,
        billingCycle,
        sessionId: session.id,
        customerId: customer.id
      }
    });

    return {
      sessionId: session.id,
      url: session.url,
      customerId: customer.id,
      expiresAt: new Date(session.expires_at * 1000)
    };
  }

  /**
   * Create Stripe payment intent for one-time payment
   */
  async createStripePaymentIntent(organizationId, amount, currency = 'USD', metadata = {}) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const organization = await Organization.findById(organizationId).populate('owner');
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get or create customer
    const customer = await this.getOrCreateStripeCustomer(organization);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customer.id,
      metadata: {
        organizationId: organization._id.toString(),
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    logger.info(`Stripe payment intent created: ${paymentIntent.id} for organization ${organizationId}`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    };
  }

  /**
   * Create Stripe subscription
   */
  async createStripeSubscription(organizationId, planId, billingCycle, paymentMethodId = null) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const organization = await Organization.findById(organizationId).populate('owner');
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get plan from database or default
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
    }

    // Get or create customer
    const customer = await this.getOrCreateStripeCustomer(organization);

    // Attach payment method to customer if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      });
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // Calculate price
    let price = plan.price;
    if (billingCycle === 'yearly' && plan.yearlyDiscount) {
      price = plan.price * 12 * (1 - plan.yearlyDiscount);
    }

    // Create price object for subscription
    const priceData = await stripe.prices.create({
      currency: plan.currency?.toLowerCase() || 'usd',
      unit_amount: Math.round(price * 100),
      recurring: {
        interval: billingCycle === 'yearly' ? 'year' : 'month'
      },
      product_data: {
        name: plan.displayName
      }
    });

    // Create subscription
    const subscriptionParams = {
      customer: customer.id,
      items: [{
        price: priceData.id
      }],
      metadata: {
        organizationId: organization._id.toString(),
        planId,
        billingCycle
      }
    };

    // Add trial period
    if (!organization.subscription?.stripeSubscriptionId) {
      subscriptionParams.trial_period_days = 14;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Update organization
    organization.subscription = {
      ...organization.subscription?.toObject(),
      plan: planId,
      status: 'active',
      billingCycle,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Stripe subscription created: ${subscription.id} for organization ${organizationId}`);

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: organization.owner?._id,
      action: 'subscription_created',
      resourceType: 'subscription',
      resourceId: subscription.id,
      resourceName: 'Stripe Subscription',
      description: `Stripe subscription created for ${plan.displayName} (${billingCycle})`,
      metadata: {
        provider: 'stripe',
        planId,
        billingCycle,
        subscriptionId: subscription.id,
        customerId: customer.id
      }
    });

    return {
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end
    };
  }

  /**
   * Cancel Stripe subscription
   */
  async cancelStripeSubscription(organizationId, immediately = false) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.subscription?.stripeSubscriptionId) {
      throw new AppError('No Stripe subscription found', 400, 'NO_SUBSCRIPTION');
    }

    const subscription = await stripe.subscriptions.update(
      organization.subscription.stripeSubscriptionId,
      { cancel_at_period_end: !immediately }
    );

    if (immediately) {
      await stripe.subscriptions.cancel(organization.subscription.stripeSubscriptionId);
    }

    logger.info(`Stripe subscription ${immediately ? 'cancelled' : 'scheduled for cancellation'}: ${organization.subscription.stripeSubscriptionId}`);

    return {
      status: immediately ? 'cancelled' : 'cancel_at_period_end',
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };
  }

  /**
   * Process Stripe webhook event
   */
  async processStripeWebhook(payload, signature) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed:', err.message);
      throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
    }

    logger.info(`Processing Stripe webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleStripeCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await this.handleStripeSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleStripeSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleStripeSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleStripeInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleStripeInvoicePaymentFailed(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await this.handleStripePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handleStripePaymentIntentFailed(event.data.object);
        break;
      default:
        logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
    }

    return { received: true, eventType: event.type };
  }

  /**
   * Handle Stripe checkout session completed
   */
  async handleStripeCheckoutCompleted(session) {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) {
      logger.warn('No organization ID in Stripe checkout session');
      return;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      logger.warn(`Organization not found for Stripe checkout: ${organizationId}`);
      return;
    }

    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle || 'monthly';

    // Update subscription status
    organization.subscription = {
      ...organization.subscription?.toObject(),
      plan: planId || 'starter',
      status: 'active',
      billingCycle,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Stripe checkout completed for organization ${organizationId}`);

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      action: 'checkout_completed',
      resourceType: 'subscription',
      resourceId: session.id,
      resourceName: 'Stripe Checkout',
      description: `Checkout session completed for plan ${planId}`,
      metadata: {
        provider: 'stripe',
        sessionId: session.id,
        planId,
        billingCycle
      }
    });
  }

  /**
   * Handle Stripe subscription created
   */
  async handleStripeSubscriptionCreated(subscription) {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    organization.subscription = {
      ...organization.subscription?.toObject(),
      stripeSubscriptionId: subscription.id,
      status: subscription.status === 'trialing' ? 'trial' : 'active',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Stripe subscription created: ${subscription.id} for organization ${organizationId}`);
  }

  /**
   * Handle Stripe subscription updated
   */
  async handleStripeSubscriptionUpdated(subscription) {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    const statusMap = {
      'active': 'active',
      'trialing': 'trial',
      'past_due': 'past_due',
      'canceled': 'cancelled',
      'unpaid': 'unpaid'
    };

    organization.subscription = {
      ...organization.subscription?.toObject(),
      status: statusMap[subscription.status] || subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Stripe subscription updated: ${subscription.id} status: ${subscription.status}`);
  }

  /**
   * Handle Stripe subscription deleted
   */
  async handleStripeSubscriptionDeleted(subscription) {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    organization.subscription = {
      ...organization.subscription?.toObject(),
      plan: 'free',
      status: 'cancelled',
      stripeSubscriptionId: null,
      cancelledAt: new Date(),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Stripe subscription cancelled: ${subscription.id} for organization ${organizationId}`);
  }

  /**
   * Handle Stripe invoice paid
   */
  async handleStripeInvoicePaid(stripeInvoice) {
    const customerId = stripeInvoice.customer;
    const organization = await Organization.findOne({ 'subscription.stripeCustomerId': customerId });

    if (!organization) {
      logger.warn(`Organization not found for Stripe customer: ${customerId}`);
      return;
    }

    // Create or update invoice record
    const invoiceNumber = await Invoice.generateInvoiceNumber(organization._id);

    const invoice = await Invoice.findOneAndUpdate(
      { externalInvoiceId: stripeInvoice.id },
      {
        organization: organization._id,
        invoiceNumber,
        externalInvoiceId: stripeInvoice.id,
        type: 'subscription',
        status: 'paid',
        subtotal: stripeInvoice.subtotal / 100,
        tax: stripeInvoice.tax || 0,
        total: stripeInvoice.total / 100,
        currency: stripeInvoice.currency.toUpperCase(),
        billingPeriod: {
          start: new Date(stripeInvoice.period_start * 1000),
          end: new Date(stripeInvoice.period_end * 1000)
        },
        payment: {
          provider: 'stripe',
          externalPaymentId: stripeInvoice.payment_intent,
          externalCustomerId: customerId,
          paidAt: new Date()
        },
        items: stripeInvoice.lines.data.map(line => ({
          description: line.description || 'Subscription',
          type: 'subscription',
          quantity: line.quantity || 1,
          unitPrice: (line.price?.unit_amount || line.amount) / 100,
          amount: line.amount / 100
        }))
      },
      { upsert: true, new: true }
    );

    logger.info(`Stripe invoice paid: ${stripeInvoice.id} for organization ${organization._id}`);

    // Add webhook event to invoice
    await invoice.addWebhookEvent('stripe', 'invoice.paid', stripeInvoice.id);
  }

  /**
   * Handle Stripe invoice payment failed
   */
  async handleStripeInvoicePaymentFailed(stripeInvoice) {
    const customerId = stripeInvoice.customer;
    const organization = await Organization.findOne({ 'subscription.stripeCustomerId': customerId });

    if (!organization) return;

    // Update invoice status
    await Invoice.findOneAndUpdate(
      { externalInvoiceId: stripeInvoice.id },
      { status: 'failed' }
    );

    // Update organization subscription status
    organization.subscription.status = 'past_due';
    await organization.save();

    logger.warn(`Stripe invoice payment failed: ${stripeInvoice.id} for organization ${organization._id}`);
  }

  /**
   * Handle Stripe payment intent succeeded
   */
  async handleStripePaymentIntentSucceeded(paymentIntent) {
    const organizationId = paymentIntent.metadata?.organizationId;
    if (!organizationId) return;

    logger.info(`Stripe payment intent succeeded: ${paymentIntent.id}`);
  }

  /**
   * Handle Stripe payment intent failed
   */
  async handleStripePaymentIntentFailed(paymentIntent) {
    const organizationId = paymentIntent.metadata?.organizationId;
    if (!organizationId) return;

    logger.warn(`Stripe payment intent failed: ${paymentIntent.id} for organization ${organizationId}`);
  }

  // ==========================================
  // RAZORPAY INTEGRATION
  // ==========================================

  /**
   * Create Razorpay customer
   */
  async createRazorpayCustomer(organizationId, email, name, metadata = {}) {
    await this.ensureProvidersInitialized();

    if (!razorpay) {
      throw new AppError('Razorpay is not configured', 500, 'RAZORPAY_NOT_CONFIGURED');
    }

    try {
      logger.info(`[Razorpay] Creating customer for org: ${organizationId}, email: ${email}, name: ${name}`);

      const customer = await razorpay.customers.create({
        name,
        email,
        notes: {
          organizationId,
          ...metadata
        }
      });

      logger.info(`[Razorpay] Customer created: ${customer.id} for organization ${organizationId}`);
      return customer;
    } catch (error) {
      const errorDetails = error.error || error;
      const errorMessage = errorDetails?.description || errorDetails?.message || error.message || JSON.stringify(error);
      logger.error(`[Razorpay] Failed to create customer: ${errorMessage}`, { error, errorDetails });
      throw new AppError(`Failed to create Razorpay customer: ${errorMessage}`, 500, 'RAZORPAY_CUSTOMER_FAILED');
    }
  }

  /**
   * Get or create Razorpay customer for organization
   */
  async getOrCreateRazorpayCustomer(organization) {
    await this.ensureProvidersInitialized();

    if (!razorpay) {
      throw new AppError('Razorpay is not configured', 500, 'RAZORPAY_NOT_CONFIGURED');
    }

    logger.info(`[Razorpay] Getting/creating customer for organization: ${organization._id}`);

    // Check if customer already exists
    if (organization.subscription?.razorpayCustomerId) {
      try {
        const customer = await razorpay.customers.fetch(organization.subscription.razorpayCustomerId);
        logger.info(`[Razorpay] Found existing customer: ${customer.id}`);
        return customer;
      } catch (error) {
        const errorMsg = error.error?.description || error.message || JSON.stringify(error);
        logger.warn(`[Razorpay] Customer fetch failed, creating new: ${errorMsg}`);
        // Customer doesn't exist, create new one
      }
    }

    // Determine email for customer
    const customerEmail = organization.owner?.email ||
      (organization.name ? `${organization.name.toLowerCase().replace(/\s+/g, '')}@example.com` : `customer-${organization._id}@example.com`);

    logger.info(`[Razorpay] Creating new customer with email: ${customerEmail}`);

    // Create new customer
    const customer = await this.createRazorpayCustomer(
      organization._id.toString(),
      customerEmail,
      organization.name || 'Organization'
    );

    // Update organization with Razorpay customer ID
    const existingSubscription = organization.subscription?.toObject?.() || organization.subscription || {};
    organization.subscription = {
      ...existingSubscription,
      razorpayCustomerId: customer.id
    };
    await organization.save();

    logger.info(`[Razorpay] Customer created and saved: ${customer.id}`);
    return customer;
  }

  /**
   * Create Razorpay order for subscription
   */
  async createRazorpayOrder(organizationId, planId, billingCycle) {
    await this.ensureProvidersInitialized();

    logger.info(`[Razorpay] Creating order for org: ${organizationId}, plan: ${planId}, billing: ${billingCycle}`);

    if (!razorpay) {
      logger.error('[Razorpay] Razorpay instance is null or undefined');
      throw new AppError('Razorpay is not configured', 500, 'RAZORPAY_NOT_CONFIGURED');
    }

    logger.info(`[Razorpay] Razorpay instance verified, key_id: ${process.env.RAZORPAY_KEY_ID ? 'present' : 'missing'}`);

    const organization = await Organization.findById(organizationId).populate('owner');
    if (!organization) {
      logger.error(`[Razorpay] Organization not found: ${organizationId}`);
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    logger.info(`[Razorpay] Found organization: ${organization.name || organization._id}, owner: ${organization.owner?._id || 'none'}`);

    // Get plan from database or default
    const plan = await this.getPlan(planId);
    logger.info(`[Razorpay] Plan lookup result:`, { planId, plan: plan ? { name: plan.name, price: plan.price, currency: plan.currency } : null });

    if (!plan) {
      logger.error(`[Razorpay] Invalid plan: ${planId}`);
      throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
    }

    // For custom pricing, redirect to sales
    if (plan.price === 'custom') {
      logger.error(`[Razorpay] Plan price is custom: ${plan.price}`);
      throw new AppError('Please contact sales for enterprise pricing', 400, 'CONTACT_SALES');
    }

    // Calculate price (allow 0 for free plans/trials)
    let price = plan.price;
    const planCurrency = plan.currency || 'USD';

    // Apply yearly discount if applicable
    if (billingCycle === 'yearly') {
      // Check for yearlyPrice in plan data
      if (plan.yearlyPrice) {
        price = plan.yearlyPrice;
      } else {
        // Apply 20% yearly discount (industry standard)
        const yearlyDiscount = plan.yearlyDiscount || 0.2;
        price = plan.price * 12 * (1 - yearlyDiscount);
      }
    }

    // Currency conversion rates (approximate, should be updated regularly or use API)
    // For production, consider using a currency conversion API
    const CURRENCY_RATES = {
      USD_TO_INR: 83.5, // Approximate rate: 1 USD = 83.5 INR
      EUR_TO_INR: 90.5,
      GBP_TO_INR: 105.5
    };

    // Convert price to INR if plan currency is not INR
    let priceInINR = price;
    if (planCurrency === 'USD') {
      priceInINR = price * CURRENCY_RATES.USD_TO_INR;
    } else if (planCurrency === 'EUR') {
      priceInINR = price * CURRENCY_RATES.EUR_TO_INR;
    } else if (planCurrency === 'GBP') {
      priceInINR = price * CURRENCY_RATES.GBP_TO_INR;
    }

    // If price is 0, create a minimal order for free plan (Razorpay minimum is 100 paise = ₹1)
    // For free plans, we'll use a minimal amount and handle it as a free subscription
    const amountInPaise = priceInINR > 0 ? Math.round(priceInINR * 100) : 100; // Minimum 100 paise (₹1) for Razorpay

    // Razorpay requires INR for Indian merchants
    const currency = 'INR';

    logger.info(`[Razorpay] Creating order with amount: ${amountInPaise} paise (${amountInPaise/100} ${currency}) for plan: ${plan.name}`);

    // Get or create customer
    let customer;
    try {
      customer = await this.getOrCreateRazorpayCustomer(organization);
      logger.info(`[Razorpay] Customer ready: ${customer.id}`);
    } catch (customerError) {
      logger.error(`[Razorpay] Failed to create customer: ${customerError.message}`, { stack: customerError.stack });
      throw new AppError(`Failed to create payment customer: ${customerError.message}`, 500, 'CUSTOMER_CREATION_FAILED');
    }

    // Create order
    let order;
    try {
      // Razorpay receipt field has a maximum of 40 characters
      // Use short prefix + last 8 chars of org ID + short timestamp
      const shortOrgId = organization._id.toString().slice(-8);
      const shortTimestamp = Date.now().toString().slice(-8);
      const receiptId = `ord_${shortOrgId}_${shortTimestamp}`; // ~21 chars, well under 40 limit

      const orderData = {
        amount: amountInPaise,
        currency: currency,
        receipt: receiptId,
        notes: {
          organizationId: organization._id.toString(),
          planId,
          billingCycle,
          customerId: customer.id,
          isFreePlan: price === 0 ? 'true' : 'false'
        }
      };

      logger.info(`[Razorpay] Calling orders.create with:`, JSON.stringify(orderData));

      order = await razorpay.orders.create(orderData);
      logger.info(`[Razorpay] Order created successfully: ${order.id}`);
    } catch (orderError) {
      // Razorpay errors can have different structures
      const errorDetails = orderError.error || orderError;
      const errorMessage = errorDetails?.description || errorDetails?.message || orderError.message || JSON.stringify(orderError);
      logger.error(`[Razorpay] Failed to create order: ${errorMessage}`, {
        error: orderError,
        errorDetails,
        statusCode: orderError.statusCode
      });
      throw new AppError(`Failed to create Razorpay order: ${errorMessage}`, 500, 'ORDER_CREATION_FAILED');
    }

    // Update organization with order ID
    try {
      const existingSubscription = organization.subscription?.toObject?.() || organization.subscription || {};
      organization.subscription = {
        ...existingSubscription,
        razorpayOrderId: order.id
      };
      await organization.save();
    } catch (saveError) {
      logger.warn(`[Razorpay] Failed to update organization: ${saveError.message}`);
      // Continue anyway, the order is created
    }

    logger.info(`Razorpay order created: ${order.id} for organization ${organizationId}`);

    // Log audit (non-blocking)
    AuditLog.log({
      organization: organizationId,
      user: organization.owner?._id,
      action: 'order_created',
      resourceType: 'payment',
      resourceId: order.id,
      resourceName: 'Razorpay Order',
      description: `Razorpay order created for ${plan.displayName} (${billingCycle})`,
      metadata: {
        provider: 'razorpay',
        orderId: order.id,
        planId,
        billingCycle,
        amount: amountInPaise
      }
    }).catch(err => logger.warn('[Razorpay] Failed to log audit:', err.message));

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      customerId: customer.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      notes: order.notes,
      // Include original plan info for frontend display
      planName: plan.displayName || plan.name,
      originalPrice: price,
      originalCurrency: planCurrency,
      billingCycle: billingCycle
    };
  }

  /**
   * Create Razorpay subscription
   */
  async createRazorpaySubscription(organizationId, planId, billingCycle) {
    await this.ensureProvidersInitialized();

    if (!razorpay) {
      throw new AppError('Razorpay is not configured', 500, 'RAZORPAY_NOT_CONFIGURED');
    }

    const organization = await Organization.findById(organizationId).populate('owner');
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get plan from database or default
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new AppError('Invalid plan', 400, 'INVALID_PLAN');
    }

    // Get or create customer
    const customer = await this.getOrCreateRazorpayCustomer(organization);

    // Calculate price
    let price = plan.price;
    if (billingCycle === 'yearly' && plan.yearlyDiscount) {
      price = plan.price * 12 * (1 - plan.yearlyDiscount);
    }

    const amountInPaise = Math.round(price * 100);

    // Create plan in Razorpay if not exists
    let razorpayPlan;
    try {
      if (plan.razorpayPlanId) {
        razorpayPlan = await razorpay.plans.fetch(plan.razorpayPlanId);
      } else {
        razorpayPlan = await razorpay.plans.create({
          period: billingCycle === 'yearly' ? 'yearly' : 'monthly',
          interval: 1,
          item: {
            name: plan.displayName,
            amount: amountInPaise,
            currency: plan.currency || 'INR',
            description: `${plan.displayName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`
          }
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch/create Razorpay plan, creating new one:', error.message);
      razorpayPlan = await razorpay.plans.create({
        period: billingCycle === 'yearly' ? 'yearly' : 'monthly',
        interval: 1,
        item: {
          name: plan.displayName,
          amount: amountInPaise,
          currency: plan.currency || 'INR',
          description: `${plan.displayName} subscription`
        }
      });
    }

    // Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlan.id,
      customer_notify: 1,
      total_count: billingCycle === 'yearly' ? 1 : 12, // For monthly, bill 12 times
      notes: {
        organizationId: organization._id.toString(),
        planId,
        billingCycle
      }
    });

    // Update organization
    const existingSub = organization.subscription?.toObject?.() || organization.subscription || {};
    organization.subscription = {
      ...existingSub,
      plan: planId,
      status: 'trial',
      billingCycle,
      razorpayCustomerId: customer.id,
      razorpaySubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.start_at * 1000),
      currentPeriodEnd: new Date(subscription.end_at * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Razorpay subscription created: ${subscription.id} for organization ${organizationId}`);

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: organization.owner?._id,
      action: 'subscription_created',
      resourceType: 'subscription',
      resourceId: subscription.id,
      resourceName: 'Razorpay Subscription',
      description: `Razorpay subscription created for ${plan.displayName} (${billingCycle})`,
      metadata: {
        provider: 'razorpay',
        subscriptionId: subscription.id,
        planId,
        billingCycle
      }
    });

    return {
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      startAt: subscription.start_at,
      endAt: subscription.end_at,
      shortUrl: subscription.short_url
    };
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyRazorpayPayment(orderId, paymentId, signature) {
    logger.info(`[Razorpay] Verifying payment signature for order: ${orderId}, payment: ${paymentId}`);

    if (!process.env.RAZORPAY_KEY_SECRET) {
      logger.error('[Razorpay] RAZORPAY_KEY_SECRET is not configured');
      throw new AppError('Razorpay key secret not configured', 500, 'CONFIG_ERROR');
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    logger.info(`[Razorpay] Signature comparison - received: ${signature?.substring(0, 10)}..., expected: ${expectedSignature?.substring(0, 10)}...`);

    const isValid = expectedSignature === signature;
    if (!isValid) {
      logger.error(`[Razorpay] Signature mismatch for order ${orderId}`);
    }

    return isValid;
  }

  /**
   * Verify and process Razorpay payment
   */
  async verifyAndProcessRazorpayPayment(organizationId, orderId, paymentId, signature) {
    await this.ensureProvidersInitialized();

    logger.info(`[Razorpay] Verifying payment for organization ${organizationId}, order ${orderId}`);

    const organization = await Organization.findById(organizationId).populate('owner');
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Verify signature
    const isValid = this.verifyRazorpayPayment(orderId, paymentId, signature);
    if (!isValid) {
      throw new AppError('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(paymentId);
    logger.info(`[Razorpay] Payment status: ${payment.status}, amount: ${payment.amount}`);

    if (payment.status !== 'captured') {
      throw new AppError('Payment not captured', 400, 'PAYMENT_NOT_CAPTURED');
    }

    // Fetch order details to get plan info from notes
    let planId = 'starter';
    let billingCycle = 'monthly';
    try {
      const order = await razorpay.orders.fetch(orderId);
      logger.info(`[Razorpay] Order fetched: ${order.id}, notes: ${JSON.stringify(order.notes)}`);
      if (order.notes?.planId) {
        planId = order.notes.planId;
      }
      if (order.notes?.billingCycle) {
        billingCycle = order.notes.billingCycle;
      }
    } catch (orderFetchError) {
      logger.warn(`[Razorpay] Could not fetch order details, using defaults: ${orderFetchError.message}`);
    }

    // Get plan details before updating subscription
    let planDisplayName = 'Subscription';
    let planName = 'Unknown';
    let planSlug = null;
    try {
      const planDetails = await this.getPlan(planId);
      planDisplayName = planDetails?.displayName || 'Subscription';
      planName = planDetails?.name || 'Unknown';
      planSlug = planDetails?.slug || null;
    } catch (e) {
      // Use default name if plan not found
    }

    // Update organization subscription
    organization.subscription = {
      ...(organization.subscription?.toObject?.() || organization.subscription || {}),
      status: 'active',
      planId: planId,
      plan: planSlug, // Store the plan slug for backward compatibility
      planName: planName,
      billingCycle: billingCycle,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`[Razorpay] Organization subscription updated: ${organization._id}, plan: ${planId}, status: active`);

    // Create invoice
    const invoiceNumber = await Invoice.generateInvoiceNumber(organization._id);
    const amount = payment.amount / 100;

    const invoice = await Invoice.create({
      organization: organization._id,
      invoiceNumber,
      externalInvoiceId: orderId,
      type: 'subscription',
      status: 'paid',
      subtotal: amount,
      total: amount,
      currency: payment.currency.toUpperCase(),
      dueDate: new Date(), // Payment already captured, due date is now
      billingPeriod: {
        start: new Date(),
        end: organization.subscription.currentPeriodEnd
      },
      items: [{
        description: `${planDisplayName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'}`,
        type: 'subscription',
        quantity: 1,
        unitPrice: amount,
        amount
      }],
      payment: {
        provider: 'razorpay',
        externalPaymentId: paymentId,
        externalCustomerId: organization.subscription.razorpayCustomerId,
        paidAt: new Date()
      },
      subscription: {
        planId,
        planName: planName,
        billingCycle
      },
      billingAddress: organization.billingDetails,
      createdBy: organization.owner?._id
    });

    logger.info(`Razorpay payment verified: ${paymentId} for organization ${organizationId}`);

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: organization.owner?._id,
      action: 'payment_verified',
      resourceType: 'payment',
      resourceId: paymentId,
      resourceName: 'Razorpay Payment',
      description: `Razorpay payment verified for ${planDisplayName}`,
      metadata: {
        provider: 'razorpay',
        orderId,
        paymentId,
        amount,
        currency: payment.currency
      }
    });

    return {
      success: true,
      paymentId,
      orderId,
      invoiceId: invoice._id,
      subscription: organization.subscription
    };
  }

  /**
   * Cancel Razorpay subscription
   */
  async cancelRazorpaySubscription(organizationId, cancelAtPeriodEnd = true) {
    await this.ensureProvidersInitialized();

    if (!razorpay) {
      throw new AppError('Razorpay is not configured', 500, 'RAZORPAY_NOT_CONFIGURED');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.subscription?.razorpaySubscriptionId) {
      throw new AppError('No Razorpay subscription found', 400, 'NO_SUBSCRIPTION');
    }

    try {
      const result = await razorpay.subscriptions.cancel(
        organization.subscription.razorpaySubscriptionId,
        cancelAtPeriodEnd ? 0 : 1 // 0 = cancel at end of cycle, 1 = cancel immediately
      );

      organization.subscription.status = 'cancelled';
      organization.subscription.cancelledAt = new Date();
      await organization.save();

      logger.info(`Razorpay subscription cancelled: ${organization.subscription.razorpaySubscriptionId}`);

      return {
        status: 'cancelled',
        cancelledAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to cancel Razorpay subscription:', error);
      throw new AppError('Failed to cancel subscription', 500, 'CANCEL_FAILED');
    }
  }

  /**
   * Process Razorpay webhook event
   */
  async processRazorpayWebhook(payload, signature) {
    await this.ensureProvidersInitialized();

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');
    }

    const event = payload;
    logger.info(`Processing Razorpay webhook event: ${event.event}`);

    switch (event.event) {
      case 'subscription.created':
        await this.handleRazorpaySubscriptionCreated(event.payload);
        break;
      case 'subscription.activated':
        await this.handleRazorpaySubscriptionActivated(event.payload);
        break;
      case 'subscription.charged':
        await this.handleRazorpaySubscriptionCharged(event.payload);
        break;
      case 'subscription.cancelled':
        await this.handleRazorpaySubscriptionCancelled(event.payload);
        break;
      case 'payment.authorized':
        await this.handleRazorpayPaymentAuthorized(event.payload);
        break;
      case 'payment.captured':
        await this.handleRazorpayPaymentCaptured(event.payload);
        break;
      case 'payment.failed':
        await this.handleRazorpayPaymentFailed(event.payload);
        break;
      default:
        logger.info(`Unhandled Razorpay webhook event: ${event.event}`);
    }

    return { received: true, eventType: event.event };
  }

  /**
   * Handle Razorpay subscription created
   */
  async handleRazorpaySubscriptionCreated(payload) {
    const subscription = payload.subscription.entity;
    const organizationId = subscription.notes?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    organization.subscription = {
      ...organization.subscription?.toObject(),
      razorpaySubscriptionId: subscription.id,
      status: 'trial',
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Razorpay subscription created: ${subscription.id}`);
  }

  /**
   * Handle Razorpay subscription activated
   */
  async handleRazorpaySubscriptionActivated(payload) {
    const subscription = payload.subscription.entity;
    const organizationId = subscription.notes?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    organization.subscription = {
      ...organization.subscription?.toObject(),
      status: 'active',
      currentPeriodStart: new Date(subscription.start_at * 1000),
      currentPeriodEnd: new Date(subscription.end_at * 1000),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Razorpay subscription activated: ${subscription.id}`);
  }

  /**
   * Handle Razorpay subscription charged
   */
  async handleRazorpaySubscriptionCharged(payload) {
    const subscription = payload.subscription.entity;
    const payment = payload.payment?.entity;
    const organizationId = subscription.notes?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    // Create invoice
    const invoiceNumber = await Invoice.generateInvoiceNumber(organizationId);
    const planId = subscription.notes?.planId || 'starter';

    await Invoice.create({
      organization: organizationId,
      invoiceNumber,
      externalInvoiceId: subscription.id,
      type: 'subscription',
      status: 'paid',
      subtotal: payment?.amount / 100 || 0,
      total: payment?.amount / 100 || 0,
      currency: payment?.currency?.toUpperCase() || 'INR',
      billingPeriod: {
        start: new Date(subscription.start_at * 1000),
        end: new Date(subscription.end_at * 1000)
      },
      items: [{
        description: `Subscription - ${planId}`,
        type: 'subscription',
        quantity: 1,
        unitPrice: payment?.amount / 100 || 0,
        amount: payment?.amount / 100 || 0
      }],
      payment: {
        provider: 'razorpay',
        externalPaymentId: payment?.id,
        paidAt: new Date()
      },
      subscription: {
        planId,
        billingCycle: subscription.notes?.billingCycle || 'monthly'
      }
    });

    organization.subscription.currentPeriodEnd = new Date(subscription.end_at * 1000);
    await organization.save();

    logger.info(`Razorpay subscription charged: ${subscription.id}`);
  }

  /**
   * Handle Razorpay subscription cancelled
   */
  async handleRazorpaySubscriptionCancelled(payload) {
    const subscription = payload.subscription.entity;
    const organizationId = subscription.notes?.organizationId;
    if (!organizationId) return;

    const organization = await Organization.findById(organizationId);
    if (!organization) return;

    organization.subscription = {
      ...organization.subscription?.toObject(),
      plan: 'free',
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date()
    };
    await organization.save();

    logger.info(`Razorpay subscription cancelled: ${subscription.id}`);
  }

  /**
   * Handle Razorpay payment authorized
   */
  async handleRazorpayPaymentAuthorized(payload) {
    logger.info(`Razorpay payment authorized: ${payload.payment?.entity?.id}`);
  }

  /**
   * Handle Razorpay payment captured
   */
  async handleRazorpayPaymentCaptured(payload) {
    const payment = payload.payment.entity;
    logger.info(`Razorpay payment captured: ${payment.id}`);
  }

  /**
   * Handle Razorpay payment failed
   */
  async handleRazorpayPaymentFailed(payload) {
    const payment = payload.payment.entity;
    const organizationId = payment.notes?.organizationId;

    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (organization) {
        organization.subscription.status = 'past_due';
        await organization.save();
      }
    }

    logger.warn(`Razorpay payment failed: ${payment.id}`);
  }

  // ==========================================
  // COMMON METHODS
  // ==========================================

  /**
   * Get payment configuration for frontend
   */
  async getPaymentConfig() {
    await this.ensureProvidersInitialized();

    // Try to get plans from database
    let plans = [];
    try {
      const dbPlans = await Plan.find({ status: 'active' }).sort({ 'billing.price': 1 });
      plans = dbPlans.map(plan => {
        const monthlyPrice = plan.billing?.price || 0;
        const yearlyDiscount = 0.2; // 20% yearly discount
        // Calculate yearly price if not explicitly set
        const yearlyPrice = plan.billing?.yearlyPrice || (monthlyPrice > 0 ? monthlyPrice * 12 * (1 - yearlyDiscount) : 0);

        return {
          id: plan._id.toString(),
          slug: plan.slug,
          name: plan.name,
          displayName: plan.displayName || plan.name,
          price: monthlyPrice,
          yearlyPrice: yearlyPrice,
          currency: plan.billing?.currency || 'USD',
          billingCycle: plan.billing?.interval === 'year' ? 'yearly' : 'monthly',
          yearlyDiscount: yearlyDiscount
        };
      });
      logger.info(`[PaymentService] Found ${plans.length} active plans in database`);
    } catch (error) {
      logger.warn('Failed to fetch plans from database, using defaults:', error.message);
    }

    // Fallback to default plans if no database plans
    if (plans.length === 0) {
      plans = Object.entries(DEFAULT_SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        yearlyDiscount: plan.yearlyDiscount
      }));
    }

    // Build available providers list
    const providers = [
      ...(stripe ? ['stripe'] : []),
      ...(razorpay ? ['razorpay'] : [])
    ];

    // Determine default provider
    let defaultProvider = process.env.DEFAULT_PAYMENT_PROVIDER || 'stripe';

    // If default provider is not available, use first available provider
    if (providers.length > 0 && !providers.includes(defaultProvider)) {
      defaultProvider = providers[0];
    }

    // If no providers available, default to stripe (will show error)
    if (providers.length === 0) {
      defaultProvider = 'stripe';
    }

    logger.info(`Payment config: providers=${providers.join(',')}, default=${defaultProvider}`);

    return {
      stripe: {
        enabled: !!stripe,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null
      },
      razorpay: {
        enabled: !!razorpay,
        keyId: process.env.RAZORPAY_KEY_ID || null
      },
      plans,
      defaultProvider,
      providers
    };
  }

  /**
   * Get available subscription plans
   */
  async getPlans() {
    // Try to get plans from database
    try {
      const dbPlans = await Plan.find({ status: 'active' }).sort({ 'billing.price': 1 });
      if (dbPlans.length > 0) {
        return dbPlans.map(plan => {
          const monthlyPrice = plan.billing?.price || 0;
          const yearlyDiscount = 0.2; // 20% yearly discount
          const yearlyPrice = plan.billing?.yearlyPrice || (monthlyPrice > 0 ? monthlyPrice * 12 * (1 - yearlyDiscount) : 0);

          return {
            id: plan._id.toString(),
            slug: plan.slug,
            name: plan.name,
            displayName: plan.displayName || plan.name,
            price: monthlyPrice,
            yearlyPrice: yearlyPrice,
            currency: plan.billing?.currency || 'USD',
            billingCycle: plan.billing?.interval === 'year' ? 'yearly' : 'monthly',
            features: plan.features || [],
            limits: plan.limits || {}
          };
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch plans from database, using defaults:', error.message);
    }

    // Fallback to default plans
    return Object.entries(DEFAULT_SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      ...plan
    }));
  }

  /**
   * Refund payment (Stripe)
   */
  async refundStripePayment(paymentIntentId, amount = null) {
    await this.ensureProvidersInitialized();

    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined
    });

    logger.info(`Stripe refund created: ${refund.id} for payment intent ${paymentIntentId}`);

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  }

  /**
   * Refund payment (Razorpay)
   */
  async refundRazorpayPayment(paymentId, amount = null) {
    await this.ensureProvidersInitialized();

    if (!razorpay) {
      throw new AppError('Razorpay is not configured', 500, 'RAZORPAY_NOT_CONFIGURED');
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined
    });

    logger.info(`Razorpay refund created: ${refund.id} for payment ${paymentId}`);

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  }
}

export default new PaymentService();