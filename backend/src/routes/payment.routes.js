/**
 * Payment Routes
 *
 * Routes for Stripe and Razorpay payment gateway integration.
 * Handles checkout sessions, subscriptions, and webhooks.
 */

import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';
import {
  validateStripeCheckout,
  validateStripePaymentIntent,
  validateStripeSubscription,
  validateRazorpayOrder,
  validateRazorpayVerify,
  validateRefund
} from '../validators/payment.validator.js';

const router = Router();

// ==========================================
// PUBLIC ENDPOINTS (for webhook handling)
// ==========================================

/**
 * @route   POST /api/payments/stripe/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public (verified by signature)
 */
router.post('/stripe/webhook',
  paymentController.handleStripeWebhook
);

/**
 * @route   POST /api/payments/razorpay/webhook
 * @desc    Handle Razorpay webhook events
 * @access  Public (verified by signature)
 */
router.post('/razorpay/webhook',
  paymentController.handleRazorpayWebhook
);

// ==========================================
// PROTECTED ENDPOINTS
// ==========================================

router.use(protect);

// ==========================================
// PAYMENT CONFIGURATION
// ==========================================

/**
 * @route   GET /api/payments/config
 * @desc    Get payment configuration
 * @access  Private
 */
router.get('/config',
  paymentController.getPaymentConfig
);

/**
 * @route   GET /api/payments/plans
 * @desc    Get available subscription plans
 * @access  Private
 */
router.get('/plans',
  paymentController.getPlans
);

// ==========================================
// STRIPE ENDPOINTS
// ==========================================

/**
 * @route   POST /api/payments/stripe/checkout
 * @desc    Create Stripe checkout session for subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/stripe/checkout',
  requirePermissions('manage_billing'),
  validateStripeCheckout,
  paymentController.createStripeCheckout
);

/**
 * @route   POST /api/payments/stripe/payment-intent
 * @desc    Create Stripe payment intent for one-time payment
 * @access  Private (requires manage_billing permission)
 */
router.post('/stripe/payment-intent',
  requirePermissions('manage_billing'),
  validateStripePaymentIntent,
  paymentController.createStripePaymentIntent
);

/**
 * @route   POST /api/payments/stripe/subscription
 * @desc    Create Stripe subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/stripe/subscription',
  requirePermissions('manage_billing'),
  validateStripeSubscription,
  paymentController.createStripeSubscription
);

/**
 * @route   POST /api/payments/stripe/cancel
 * @desc    Cancel Stripe subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/stripe/cancel',
  requirePermissions('manage_billing'),
  paymentController.cancelStripeSubscription
);

/**
 * @route   POST /api/payments/stripe/refund
 * @desc    Refund Stripe payment
 * @access  Private (requires manage_billing permission)
 */
router.post('/stripe/refund',
  requirePermissions('manage_billing'),
  validateRefund,
  paymentController.refundStripePayment
);

// ==========================================
// RAZORPAY ENDPOINTS
// ==========================================

/**
 * @route   POST /api/payments/razorpay/order
 * @desc    Create Razorpay order for subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/razorpay/order',
  requirePermissions('manage_billing'),
  validateRazorpayOrder,
  paymentController.createRazorpayOrder
);

/**
 * @route   POST /api/payments/razorpay/subscription
 * @desc    Create Razorpay subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/razorpay/subscription',
  requirePermissions('manage_billing'),
  validateRazorpayOrder,
  paymentController.createRazorpaySubscription
);

/**
 * @route   POST /api/payments/razorpay/verify
 * @desc    Verify Razorpay payment
 * @access  Private (requires manage_billing permission)
 */
router.post('/razorpay/verify',
  requirePermissions('manage_billing'),
  validateRazorpayVerify,
  paymentController.verifyRazorpayPayment
);

/**
 * @route   POST /api/payments/razorpay/cancel
 * @desc    Cancel Razorpay subscription
 * @access  Private (requires manage_billing permission)
 */
router.post('/razorpay/cancel',
  requirePermissions('manage_billing'),
  paymentController.cancelRazorpaySubscription
);

/**
 * @route   POST /api/payments/razorpay/refund
 * @desc    Refund Razorpay payment
 * @access  Private (requires manage_billing permission)
 */
router.post('/razorpay/refund',
  requirePermissions('manage_billing'),
  validateRefund,
  paymentController.refundRazorpayPayment
);

export default router;