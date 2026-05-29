/**
 * Payment Controller
 *
 * Handles HTTP requests for payment endpoints.
 * Stripe and Razorpay payment gateway integration.
 */

import paymentService from '../services/payment.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class PaymentController {
  // ==========================================
  // STRIPE ENDPOINTS
  // ==========================================

  /**
   * Create Stripe checkout session
   * POST /api/payments/stripe/checkout
   */
  async createStripeCheckout(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { planId, billingCycle, successUrl, cancelUrl } = req.body;

      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'PLAN_REQUIRED');
      }

      const result = await paymentService.createStripeCheckoutSession(
        organizationId,
        planId,
        billingCycle || 'monthly',
        successUrl,
        cancelUrl
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Checkout session created successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Stripe checkout error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Create Stripe payment intent
   * POST /api/payments/stripe/payment-intent
   */
  async createStripePaymentIntent(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { amount, currency, metadata } = req.body;

      if (!amount || amount <= 0) {
        throw new AppError('Valid amount is required', 400, 'AMOUNT_REQUIRED');
      }

      const result = await paymentService.createStripePaymentIntent(
        organizationId,
        amount,
        currency || 'USD',
        metadata || {}
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Payment intent created successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Stripe payment intent error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Create Stripe subscription
   * POST /api/payments/stripe/subscription
   */
  async createStripeSubscription(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { planId, billingCycle, paymentMethodId } = req.body;

      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'PLAN_REQUIRED');
      }

      const result = await paymentService.createStripeSubscription(
        organizationId,
        planId,
        billingCycle || 'monthly',
        paymentMethodId
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subscription created successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Stripe subscription error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Cancel Stripe subscription
   * POST /api/payments/stripe/cancel
   */
  async cancelStripeSubscription(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { immediately } = req.body;

      const result = await paymentService.cancelStripeSubscription(organizationId, immediately);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Stripe cancel error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Handle Stripe webhook
   * POST /api/payments/stripe/webhook
   */
  async handleStripeWebhook(req, res, next) {
    try {
      const signature = req.headers['stripe-signature'];
      const payload = req.body;

      // Raw body is needed for signature verification
      const result = await paymentService.processStripeWebhook(
        Buffer.isBuffer(payload) ? payload : JSON.stringify(payload),
        signature
      );

      res.status(200).json({
        received: true,
        ...result
      });
    } catch (error) {
      logger.error(`[PaymentController] Stripe webhook error: ${error.message}`);
      // Return 200 to prevent Stripe retries for known errors
      res.status(200).json({
        received: false,
        error: error.message
      });
    }
  }

  /**
   * Refund Stripe payment
   * POST /api/payments/stripe/refund
   */
  async refundStripePayment(req, res, next) {
    try {
      const { paymentIntentId, amount } = req.body;

      if (!paymentIntentId) {
        throw new AppError('Payment intent ID is required', 400, 'PAYMENT_INTENT_REQUIRED');
      }

      const result = await paymentService.refundStripePayment(paymentIntentId, amount);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Stripe refund error: ${error.message}`);
      next(error);
    }
  }

  // ==========================================
  // RAZORPAY ENDPOINTS
  // ==========================================

  /**
   * Create Razorpay order
   * POST /api/payments/razorpay/order
   */
  async createRazorpayOrder(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { planId, billingCycle } = req.body;

      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'PLAN_REQUIRED');
      }

      const result = await paymentService.createRazorpayOrder(
        organizationId,
        planId,
        billingCycle || 'monthly'
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Order created successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Razorpay order error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Create Razorpay subscription
   * POST /api/payments/razorpay/subscription
   */
  async createRazorpaySubscription(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { planId, billingCycle } = req.body;

      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'PLAN_REQUIRED');
      }

      const result = await paymentService.createRazorpaySubscription(
        organizationId,
        planId,
        billingCycle || 'monthly'
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subscription created successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Razorpay subscription error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Verify Razorpay payment
   * POST /api/payments/razorpay/verify
   */
  async verifyRazorpayPayment(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { orderId, paymentId, signature } = req.body;

      if (!orderId || !paymentId || !signature) {
        throw new AppError('Order ID, payment ID, and signature are required', 400, 'MISSING_PARAMS');
      }

      const result = await paymentService.verifyAndProcessRazorpayPayment(
        organizationId,
        orderId,
        paymentId,
        signature
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Payment verified successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Razorpay verify error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Cancel Razorpay subscription
   * POST /api/payments/razorpay/cancel
   */
  async cancelRazorpaySubscription(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { cancelAtPeriodEnd } = req.body;

      const result = await paymentService.cancelRazorpaySubscription(
        organizationId,
        cancelAtPeriodEnd !== false
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Razorpay cancel error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Handle Razorpay webhook
   * POST /api/payments/razorpay/webhook
   */
  async handleRazorpayWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const payload = req.body;

      const result = await paymentService.processRazorpayWebhook(payload, signature);

      res.status(200).json({
        received: true,
        ...result
      });
    } catch (error) {
      logger.error(`[PaymentController] Razorpay webhook error: ${error.message}`);
      res.status(200).json({
        received: false,
        error: error.message
      });
    }
  }

  /**
   * Refund Razorpay payment
   * POST /api/payments/razorpay/refund
   */
  async refundRazorpayPayment(req, res, next) {
    try {
      const { paymentId, amount } = req.body;

      if (!paymentId) {
        throw new AppError('Payment ID is required', 400, 'PAYMENT_ID_REQUIRED');
      }

      const result = await paymentService.refundRazorpayPayment(paymentId, amount);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      logger.error(`[PaymentController] Razorpay refund error: ${error.message}`);
      next(error);
    }
  }

  // ==========================================
  // COMMON ENDPOINTS
  // ==========================================

  /**
   * Get payment configuration
   * GET /api/payments/config
   */
  async getPaymentConfig(req, res, next) {
    try {
      const config = await paymentService.getPaymentConfig();

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available plans
   * GET /api/payments/plans
   */
  async getPlans(req, res, next) {
    try {
      const plans = paymentService.getPlans();

      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();