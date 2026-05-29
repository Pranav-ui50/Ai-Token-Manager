/**
 * Feature Validators
 *
 * Validation schemas for feature endpoints.
 */

import { body, param, query } from 'express-validator';

export const featureValidators = {
  // Create feature validation
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Feature name is required')
      .isLength({ max: 100 })
      .withMessage('Feature name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('category')
      .optional()
      .isIn(['chat', 'completion', 'embedding', 'image', 'audio', 'video', 'other'])
      .withMessage('Invalid category'),

    body('model')
      .optional({ checkFalsy: true })
      .isMongoId()
      .withMessage('Invalid model ID'),

    body('provider')
      .optional({ checkFalsy: true })
      .isMongoId()
      .withMessage('Invalid provider ID'),

    body('tokenEstimates.inputTokensPerRequest')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Input tokens must be a non-negative integer'),

    body('tokenEstimates.outputTokensPerRequest')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Output tokens must be a non-negative integer'),

    body('tokenEstimates.averageTokensPerRequest')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Average tokens must be a non-negative integer'),

    body('tokenEstimates.calculationMethod')
      .optional()
      .isIn(['fixed', 'dynamic', 'user-based'])
      .withMessage('Invalid calculation method'),

    body('limits.maxRequestsPerUser')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max requests must be a non-negative integer'),

    body('limits.maxTokensPerUser')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max tokens must be a non-negative integer'),

    // Infrastructure cost validation (FR-21)
    body('infrastructureCost.fixedCostPerRequest')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fixed cost per request must be a non-negative number'),

    body('infrastructureCost.overheadPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Overhead percentage must be between 0 and 100'),

    body('infrastructureCost.monthlyFixedCost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monthly fixed cost must be a non-negative number'),

    body('infrastructureCost.currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP'])
      .withMessage('Invalid currency'),

    body('infrastructureCost.infrastructureType')
      .optional()
      .isIn(['serverless', 'dedicated', 'hybrid', 'shared'])
      .withMessage('Invalid infrastructure type'),

    body('infrastructureCost.notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),

    body('settings.enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean'),

    body('status')
      .optional()
      .isIn(['active', 'inactive', 'maintenance', 'deprecated'])
      .withMessage('Invalid status')
  ],

  // Update feature validation
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid feature ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Feature name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('category')
      .optional()
      .isIn(['chat', 'completion', 'embedding', 'image', 'audio', 'video', 'other'])
      .withMessage('Invalid category'),

    body('model')
      .optional({ checkFalsy: true })
      .isMongoId()
      .withMessage('Invalid model ID'),

    body('provider')
      .optional({ checkFalsy: true })
      .isMongoId()
      .withMessage('Invalid provider ID'),

    body('tokenEstimates.inputTokensPerRequest')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Input tokens must be a non-negative integer'),

    body('tokenEstimates.outputTokensPerRequest')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Output tokens must be a non-negative integer'),

    // Infrastructure cost validation (FR-21)
    body('infrastructureCost.fixedCostPerRequest')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fixed cost per request must be a non-negative number'),

    body('infrastructureCost.overheadPercentage')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Overhead percentage must be between 0 and 100'),

    body('infrastructureCost.monthlyFixedCost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monthly fixed cost must be a non-negative number'),

    body('infrastructureCost.currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP'])
      .withMessage('Invalid currency'),

    body('infrastructureCost.infrastructureType')
      .optional()
      .isIn(['serverless', 'dedicated', 'hybrid', 'shared'])
      .withMessage('Invalid infrastructure type'),

    body('infrastructureCost.notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),

    body('status')
      .optional()
      .isIn(['active', 'inactive', 'maintenance', 'deprecated'])
      .withMessage('Invalid status')
  ],

  // Bulk status update validation
  bulkStatus: [
    body('featureIds')
      .isArray({ min: 1 })
      .withMessage('At least one feature ID is required'),

    body('featureIds.*')
      .isMongoId()
      .withMessage('Invalid feature ID'),

    body('status')
      .isIn(['active', 'inactive', 'maintenance', 'deprecated'])
      .withMessage('Invalid status')
  ],

  // Calculate cost validation
  calculateCost: [
    param('id')
      .isMongoId()
      .withMessage('Invalid feature ID'),

    body('requestsPerMonth')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Requests per month must be a positive integer'),

    body('usersPerMonth')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Users per month must be a positive integer')
  ]
};

export default featureValidators;