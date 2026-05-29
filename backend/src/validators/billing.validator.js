/**
 * Billing Validator
 *
 * Validation schemas for billing endpoints using express-validator.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Validate update subscription
 */
export const validateUpdateSubscription = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('plan')
    .isIn(['free', 'starter', 'professional', 'enterprise'])
    .withMessage('Plan must be one of: free, starter, professional, enterprise'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly')
]);

/**
 * Validate cancel subscription
 */
export const validateCancelSubscription = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
]);

/**
 * Validate billing details update
 */
export const validateUpdateBillingDetails = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax ID cannot exceed 50 characters'),
  body('vatNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('VAT number cannot exceed 50 characters')
]);

/**
 * Validate add payment method
 */
export const validateAddPaymentMethod = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('type')
    .optional()
    .isIn(['card', 'bank_account'])
    .withMessage('Type must be card or bank_account'),
  body('last4')
    .matches(/^\d{4}$/)
    .withMessage('Last 4 digits must be exactly 4 numbers'),
  body('brand')
    .optional()
    .isIn(['visa', 'mastercard', 'amex', 'discover', 'other'])
    .withMessage('Brand must be one of: visa, mastercard, amex, discover, other'),
  body('expiryMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Expiry month must be between 1 and 12'),
  body('expiryYear')
    .optional()
    .isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 })
    .withMessage('Expiry year must be a valid future year')
]);

/**
 * Validate preview subscription change
 */
export const validatePreviewSubscriptionChange = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('plan')
    .isIn(['free', 'starter', 'professional', 'enterprise'])
    .withMessage('Plan must be one of: free, starter, professional, enterprise'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly')
]);

/**
 * Validate organization ID param
 */
export const validateOrganizationId = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID')
]);

/**
 * Validate invoice ID param
 */
export const validateInvoiceId = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  param('invoiceId')
    .notEmpty()
    .withMessage('Invoice ID is required')
]);

/**
 * Validate payment method ID param
 */
export const validatePaymentMethodId = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  param('methodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
]);