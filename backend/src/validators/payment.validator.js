/**
 * Payment Validator
 *
 * Validation schemas for payment endpoints using express-validator.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

// Helper to validate plan ID (can be slug or MongoDB ObjectId)
const isValidPlanId = (value) => {
  // Check if it's a valid slug (starter, professional, enterprise)
  const validSlugs = ['starter', 'professional', 'enterprise', 'free'];
  if (validSlugs.includes(value)) {
    return true;
  }
  // Check if it's a valid MongoDB ObjectId (24 character hex string)
  if (/^[a-fA-F0-9]{24}$/.test(value)) {
    return true;
  }
  return false;
};

/**
 * Validate Stripe checkout session creation
 */
export const validateStripeCheckout = validate([
  body('organizationId')
    .optional()
    .custom((value) => {
      if (value && !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw new Error('Organization ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .custom((value) => {
      if (!isValidPlanId(value)) {
        throw new Error('Plan ID must be a valid plan slug or MongoDB ObjectId');
      }
      return true;
    }),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly'),
  body('successUrl')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'string' && value.length > 0) {
        // Accept any non-empty string that looks like a URL
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          throw new Error('Success URL must start with http:// or https://');
        }
      }
      return true;
    }),
  body('cancelUrl')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'string' && value.length > 0) {
        // Accept any non-empty string that looks like a URL
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          throw new Error('Cancel URL must start with http:// or https://');
        }
      }
      return true;
    })
]);

/**
 * Validate Stripe payment intent creation
 */
export const validateStripePaymentIntent = validate([
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
]);

/**
 * Validate Stripe subscription creation
 */
export const validateStripeSubscription = validate([
  body('organizationId')
    .optional()
    .custom((value) => {
      if (value && !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw new Error('Organization ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .custom((value) => {
      if (!isValidPlanId(value)) {
        throw new Error('Plan ID must be a valid plan slug or MongoDB ObjectId');
      }
      return true;
    }),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly'),
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string')
]);

/**
 * Validate Razorpay order creation
 */
export const validateRazorpayOrder = validate([
  body('organizationId')
    .optional()
    .custom((value) => {
      if (value && !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw new Error('Organization ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .custom((value) => {
      if (!isValidPlanId(value)) {
        throw new Error('Plan ID must be a valid plan slug or MongoDB ObjectId');
      }
      return true;
    }),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly')
]);

/**
 * Validate Razorpay payment verification
 */
export const validateRazorpayVerify = validate([
  body('organizationId')
    .optional()
    .custom((value) => {
      if (value && !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw new Error('Organization ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('signature')
    .notEmpty()
    .withMessage('Signature is required')
]);

/**
 * Validate refund request
 */
export const validateRefund = validate([
  body('paymentIntentId')
    .optional()
    .notEmpty()
    .withMessage('Payment intent ID cannot be empty')
    .isString()
    .withMessage('Payment intent ID must be a string'),
  body('paymentId')
    .optional()
    .notEmpty()
    .withMessage('Payment ID cannot be empty')
    .isString()
    .withMessage('Payment ID must be a string'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be a positive number')
]);

/**
 * Validate payment ID param
 */
export const validatePaymentId = validate([
  param('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
]);