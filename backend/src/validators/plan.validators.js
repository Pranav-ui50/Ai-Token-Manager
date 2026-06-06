/**
 * Plan Validators
 *
 * Validation schemas for plan endpoints.
 */

import { body, param, query } from 'express-validator';

export const planValidators = {
  // Create plan validation
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Plan name is required')
      .isLength({ max: 100 })
      .withMessage('Plan name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),

    body('tier')
      .optional()
      .isIn(['free', 'starter', 'professional', 'business', 'enterprise'])
      .withMessage('Invalid tier'),

    body('billing.price')
      .notEmpty()
      .withMessage('Price is required')
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),

    body('billing.currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-letter code'),

    body('billing.interval')
      .optional()
      .isIn(['month', 'year', 'one-time'])
      .withMessage('Invalid billing interval'),

    body('billing.trialDays')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Trial days must be a non-negative integer'),

    body('features')
      .optional()
      .isArray()
      .withMessage('Features must be an array'),

    body('features.*.feature')
      .if(body('features').isArray({ min: 1 }))
      .isMongoId()
      .withMessage('Invalid feature ID'),

    body('features.*.enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean'),

    body('features.*.limits.maxRequests')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max requests must be a non-negative integer'),

    body('features.*.limits.maxTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max tokens must be a non-negative integer'),

    body('limits.maxUsers')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max users must be a non-negative integer'),

    body('limits.maxApiCalls')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max API calls must be a non-negative integer'),

    body('limits.maxTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max tokens must be a non-negative integer'),

    // Pricing model validation (FR-31)
    body('pricingModel.type')
      .optional()
      .isIn(['flat', 'usage-based', 'tiered', 'hybrid'])
      .withMessage('Invalid pricing model type'),

    body('pricingModel.usageBased.pricePerToken')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per token must be a non-negative number'),

    body('pricingModel.usageBased.pricePerRequest')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per request must be a non-negative number'),

    body('pricingModel.usageBased.includedTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Included tokens must be a non-negative integer'),

    body('pricingModel.usageBased.includedRequests')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Included requests must be a non-negative integer'),

    body('pricingModel.usageBased.overageMultiplier')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Overage multiplier must be a non-negative number'),

    // Credit system validation (FR-32)
    body('credits.includedCredits')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Included credits must be a non-negative integer'),

    body('credits.creditType')
      .optional()
      .isIn(['token', 'request', 'point'])
      .withMessage('Invalid credit type'),

    body('credits.rollover.enabled')
      .optional()
      .isBoolean()
      .withMessage('Rollover enabled must be a boolean'),

    body('credits.rollover.maxRolloverPercent')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Max rollover percent must be between 0 and 100'),

    body('credits.rollover.expirationMonths')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Expiration months must be at least 1'),

    body('credits.creditPricing.pricePerCredit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per credit must be a non-negative number'),

    body('credits.autoRecharge.enabled')
      .optional()
      .isBoolean()
      .withMessage('Auto recharge enabled must be a boolean'),

    body('credits.autoRecharge.threshold')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Auto recharge threshold must be a non-negative integer'),

    body('credits.autoRecharge.rechargeAmount')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Auto recharge amount must be at least 1'),

    body('settings.isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),

    body('status')
      .optional()
      .isIn(['draft', 'active', 'archived', 'deprecated'])
      .withMessage('Invalid status')
  ],

  // Update plan validation
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid plan ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Plan name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),

    body('tier')
      .optional()
      .isIn(['free', 'starter', 'professional', 'business', 'enterprise'])
      .withMessage('Invalid tier'),

    body('billing.price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),

    body('billing.interval')
      .optional()
      .isIn(['month', 'year', 'one-time'])
      .withMessage('Invalid billing interval'),

    body('features')
      .optional()
      .isArray()
      .withMessage('Features must be an array'),

    body('features.*.feature')
      .if(body('features').isArray({ min: 1 }))
      .isMongoId()
      .withMessage('Invalid feature ID'),

    // Pricing model validation (FR-31)
    body('pricingModel.type')
      .optional()
      .isIn(['flat', 'usage-based', 'tiered', 'hybrid'])
      .withMessage('Invalid pricing model type'),

    body('pricingModel.usageBased.pricePerToken')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per token must be a non-negative number'),

    body('pricingModel.usageBased.pricePerRequest')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per request must be a non-negative number'),

    body('pricingModel.usageBased.includedTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Included tokens must be a non-negative integer'),

    body('pricingModel.usageBased.includedRequests')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Included requests must be a non-negative integer'),

    // Credit system validation (FR-32)
    body('credits.includedCredits')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Included credits must be a non-negative integer'),

    body('credits.creditType')
      .optional()
      .isIn(['token', 'request', 'point'])
      .withMessage('Invalid credit type'),

    body('credits.rollover.enabled')
      .optional()
      .isBoolean()
      .withMessage('Rollover enabled must be a boolean'),

    body('credits.rollover.maxRolloverPercent')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Max rollover percent must be between 0 and 100'),

    body('credits.creditPricing.pricePerCredit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per credit must be a non-negative number'),

    body('credits.autoRecharge.enabled')
      .optional()
      .isBoolean()
      .withMessage('Auto recharge enabled must be a boolean'),

    body('credits.autoRecharge.threshold')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Auto recharge threshold must be a non-negative integer'),

    body('status')
      .optional()
      .isIn(['draft', 'active', 'archived', 'deprecated'])
      .withMessage('Invalid status')
  ],

  // Compare plans validation
  compare: [
    body('planIds')
      .isArray({ min: 2 })
      .withMessage('At least 2 plan IDs are required'),

    body('planIds.*')
      .isMongoId()
      .withMessage('Invalid plan ID')
  ],

  // Reorder plans validation
  reorder: [
    body('planOrders')
      .isArray({ min: 1 })
      .withMessage('Plan orders are required'),

    body('planOrders.*.id')
      .isMongoId()
      .withMessage('Invalid plan ID'),

    body('planOrders.*.displayOrder')
      .isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer')
  ]
};

export default planValidators;