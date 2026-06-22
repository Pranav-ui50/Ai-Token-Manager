/**
 * Webhook Verification Middleware
 *
 * Verifies webhook signatures for incoming provider webhooks.
 * Supports multiple signature formats (HMAC-SHA256, etc.)
 */

import crypto from 'crypto';
import { AppError } from './error.middleware.js';
import logger from '../config/logger.js';

/**
 * Verify webhook signature for specific providers
 * @param {string} provider - Provider name (stripe, razorpay, openai, etc.)
 * @returns {Function} Express middleware
 */
export const verifyWebhookSignature = (provider) => {
  return async (req, res, next) => {
    try {
    const signature = req.headers['x-webhook-signature'] ||
                      req.headers['x-signature'] ||
                      req.headers['stripe-signature'] ||
                      req.headers['x-razorpay-signature'];

    if (!signature) {
      logger.warn(`[WebhookVerify] Missing signature for ${provider} webhook`);
      // Allow in development, reject in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          success: false,
          error: { message: 'Missing webhook signature' }
        });
      }
      return next();
    }

    // Get provider-specific secret
    const secret = getProviderSecret(provider);
    if (!secret) {
      logger.warn(`[WebhookVerify] No secret configured for ${provider}`);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          success: false,
          error: { message: 'Webhook verification not configured' }
        });
      }
      return next();
    }

    // Get raw body for signature verification
    const payload = req.rawBody || JSON.stringify(req.body);
    let isValid = false;

    switch (provider) {
      case 'stripe':
        isValid = verifyStripeSignature(signature, payload, secret, req.headers['stripe-signature']);
        break;
      case 'razorpay':
        isValid = verifyRazorpaySignature(signature, payload, secret);
        break;
      case 'openai':
        isValid = verifyHMACSignature(signature, payload, secret);
        break;
      case 'anthropic':
        isValid = verifyHMACSignature(signature, payload, secret);
        break;
      default:
        // Generic HMAC verification
        isValid = verifyHMACSignature(signature, payload, secret);
    }

    if (!isValid) {
      logger.warn(`[WebhookVerify] Invalid signature for ${provider} webhook`);
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid webhook signature' }
        });
      }
      logger.warn('[WebhookVerify] Accepting invalid signature in development mode');
    }

    logger.info(`[WebhookVerify] ${provider} webhook signature verified`);
    next();
  } catch (error) {
      logger.error(`[WebhookVerify] Signature verification error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: { message: 'Webhook signature verification failed' }
    });
  }
};
};

/**
 * Get provider-specific webhook secret
 * @param {string} provider - Provider name
 * @returns {string|null} Secret key
 */
function getProviderSecret(provider) {
  const secrets = {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    razorpay: process.env.RAZORPAY_WEBHOOK_SECRET,
    openai: process.env.OPENAI_WEBHOOK_SECRET,
    anthropic: process.env.ANTHROPIC_WEBHOOK_SECRET,
    custom: process.env.WEBHOOK_SECRET
  };
  return secrets[provider] || secrets.custom;
}

/**
 * Verify Stripe webhook signature
 * Stripe uses a specific format: t=timestamp,v1=signature
 * @param {string} signature - Stripe signature header
 * @param {string} payload - Raw request body
 * @param {string} secret - Stripe webhook secret
 * @param {string} header - Full Stripe signature header
 * @returns {boolean} Is valid
 */
function verifyStripeSignature(signature, payload, secret, header) {
  try {
    if (!header || !secret) return false;

    // Parse the Stripe signature header
    const elements = header.split(',');
    let timestamp = null;
    let v1Signature = null;

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        v1Signature = value;
      }
    }

    if (!timestamp || !v1Signature) return false;

    // Check timestamp to prevent replay attacks (5 minute tolerance)
    const now = Math.floor(Date.now() / 1000);
    const tolerance = 300; // 5 minutes
    if (Math.abs(now - parseInt(timestamp)) > tolerance) {
      logger.warn('[WebhookVerify] Stripe webhook timestamp too old');
      return false;
    }

    // Create the expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(v1Signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error(`[WebhookVerify] Stripe signature verification error: ${error.message}`);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 * Razorpay uses HMAC-SHA256 with the webhook secret
 * @param {string} signature - Signature header
 * @param {string} payload - Raw request body
 * @param {string} secret - Razorpay webhook secret
 * @returns {boolean} Is valid
 */
function verifyRazorpaySignature(signature, payload, secret) {
  try {
    if (!signature || !secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error(`[WebhookVerify] Razorpay signature verification error: ${error.message}`);
    return false;
  }
}

/**
 * Verify generic HMAC-SHA256 signature
 * @param {string} signature - Signature header
 * @param {string} payload - Raw request body
 * @param {string} secret - Webhook secret
 * @returns {boolean} Is valid
 */
function verifyHMACSignature(signature, payload, secret) {
  try {
    if (!signature || !secret) return false;

    // Handle different signature formats
    let cleanSignature = signature;
    if (signature.startsWith('sha256=')) {
      cleanSignature = signature.substring(7);
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error(`[WebhookVerify] HMAC signature verification error: ${error.message}`);
    return false;
  }
}

/**
 * Verify webhook signature from Integration model
 * Used when receiving webhooks for a specific integration
 * @param {Object} integration - Integration document
 * @param {Object} req - Express request
 * @returns {boolean} Is valid
 */
export const verifyIntegrationWebhook = (integration, req) => {
  try {
    const secret = integration.credentials?.webhookSecret || integration.config?.secret;
    if (!secret) {
      logger.warn(`[WebhookVerify] No secret for integration ${integration._id}`);
      return process.env.NODE_ENV !== 'production';
    }

    const signature = req.headers['x-webhook-signature'] ||
                      req.headers['x-signature'] ||
                      req.headers['x-hub-signature-256'] ||
                      req.headers['signature'];

    if (!signature) {
      logger.warn(`[WebhookVerify] Missing signature for integration ${integration._id}`);
      return process.env.NODE_ENV !== 'production';
    }

    const payload = req.rawBody || JSON.stringify(req.body);
    return verifyHMACSignature(signature, payload, secret);
  } catch (error) {
    logger.error(`[WebhookVerify] Integration webhook verification error: ${error.message}`);
    return false;
  }
};

export default {
  verifyWebhookSignature,
  verifyIntegrationWebhook
};