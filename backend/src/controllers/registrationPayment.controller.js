/**
 * Registration Payment Controller
 *
 * Handles HTTP requests for the registration-to-payment flow.
 */

import registrationPaymentService from '../services/registrationPayment.service.js';
import logger from '../config/logger.js';

class RegistrationPaymentController {
  /**
   * Initiate registration with payment
   * @route POST /api/auth/register/payment
   */
  async initiatePayment(req, res, next) {
    try {
      const { email, password, firstName, lastName, organizationName, planId, billingCycle, paymentProvider, currency, amount } = req.body;

      logger.info(`[RegistrationPaymentController] Initiating payment for: ${email}, currency: ${currency}, amount: ${amount}`);

      const result = await registrationPaymentService.initiateRegistrationPayment({
        email,
        password,
        firstName,
        lastName,
        organizationName,
        planId,
        billingCycle,
        currency,
        amount
      }, paymentProvider || 'razorpay');

      // If no payment required (free plan), create account directly
      if (!result.requiresPayment) {
        // Import auth service for free plan registration
        const authService = (await import('../services/auth.service.js')).default;

        const authResult = await authService.register({
          email,
          password,
          firstName,
          lastName,
          organizationName,
          planId: 'free',
          billingCycle: 'monthly'
        });

        return res.status(201).json({
          success: true,
          message: 'Registration successful',
          data: {
            user: authResult.user,
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            expiresIn: authResult.expiresIn,
            requiresPayment: false
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment initiated. Complete payment to finalize registration.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Razorpay payment and complete registration
   * @route POST /api/auth/register/verify-razorpay
   */
  async verifyRazorpayPayment(req, res, next) {
    try {
      const { orderId, paymentId, signature } = req.body;

      logger.info(`[RegistrationPaymentController] Verifying Razorpay payment: ${orderId}`);

      const result = await registrationPaymentService.completeRazorpayRegistration(
        orderId,
        paymentId,
        signature
      );

      res.status(201).json({
        success: true,
        message: 'Registration completed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook for registration completion
   * @route POST /api/auth/register/stripe-webhook
   */
  async handleStripeWebhook(req, res, next) {
    try {
      const sig = req.headers['stripe-signature'];
      const stripe = (await import('stripe')).default(config.stripe?.secretKey);

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
      } catch (err) {
        logger.error('[RegistrationPaymentController] Stripe webhook signature verification failed:', err);
        return res.status(400).json({ success: false, error: 'Webhook signature verification failed' });
      }

      logger.info(`[RegistrationPaymentController] Stripe webhook received: ${event.type}`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const pendingRegistrationId = session.metadata?.pendingRegistrationId;

        if (pendingRegistrationId) {
          await registrationPaymentService.completeStripeRegistration(session.id);
        }
      }

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete Stripe registration (called from frontend success page)
   * @route POST /api/auth/register/complete-stripe
   */
  async completeStripeRegistration(req, res, next) {
    try {
      const { sessionId } = req.body;

      logger.info(`[RegistrationPaymentController] Completing Stripe registration for session: ${sessionId}`);

      const result = await registrationPaymentService.completeStripeRegistration(sessionId);

      res.status(201).json({
        success: true,
        message: 'Registration completed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel pending registration
   * @route POST /api/auth/register/cancel
   */
  async cancelRegistration(req, res, next) {
    try {
      const { pendingId } = req.body;

      const result = await registrationPaymentService.cancelPendingRegistration(pendingId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending registration status
   * @route GET /api/auth/register/pending/:id
   */
  async getPendingStatus(req, res, next) {
    try {
      const { id } = req.params;

      const result = await registrationPaymentService.getPendingStatus(id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry payment for pending registration
   * @route POST /api/auth/register/retry-payment
   */
  async retryPayment(req, res, next) {
    try {
      const { pendingId, paymentProvider } = req.body;

      const result = await registrationPaymentService.retryPayment(pendingId, paymentProvider);

      res.json({
        success: true,
        message: 'Payment retry initiated',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RegistrationPaymentController();