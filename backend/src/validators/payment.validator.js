/**
 * Payment Validator
 *
 * Validation schemas for payment endpoints using express-validator.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Validate Stripe checkout session creation
 */
export const validateStripeCheckout = validate([
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Plan must be starter, professional, or enterprise'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly'),
  body('successUrl')
    .optional()
    .isURL()
    .withMessage('Success URL must be a valid URL'),
  body('cancelUrl')
    .optional()
    .isURL()
    .withMessage('Cancel URL must be a valid URL')
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
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Plan must be starter, professional, or enterprise'),
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
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Plan must be starter, professional, or enterprise'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly')
]);

/**
 * Validate Razorpay payment verification
 */
export const validateRazorpayVerify = validate([
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .matches(/^order_[a-zA-Z0-9]+$/)
    .withMessage('Invalid Razorpay order ID format'),
  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .matches(/^pay_[a-zA-Z0-9]+$/)
    .withMessage('Invalid Razorpay payment ID format'),
  body('signature')
    .notEmpty()
    .withMessage('Signature is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Signature must be 64 characters')
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