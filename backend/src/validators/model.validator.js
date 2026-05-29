/**
 * Model Validator
 *
 * Validation schemas for AI model endpoints.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Validate model creation
 */
export const validateCreate = validate([
  body('providerId')
    .notEmpty()
    .withMessage('Provider ID is required')
    .isMongoId()
    .withMessage('Invalid provider ID'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Model name is required')
    .isLength({ max: 100 })
    .withMessage('Model name cannot exceed 100 characters'),
  body('displayName')
    .trim()
    .notEmpty()
    .withMessage('Display name is required')
    .isLength({ max: 150 })
    .withMessage('Display name cannot exceed 150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['chat', 'completion', 'embedding', 'image', 'audio', 'other'])
    .withMessage('Invalid model type'),
  body('capabilities.contextWindow')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Context window must be a positive integer'),
  body('capabilities.maxOutputTokens')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max output tokens must be a positive integer'),
  body('pricing.inputPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Input price must be a non-negative number'),
  body('pricing.outputPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Output price must be a non-negative number'),
  body('defaults.temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  body('defaults.topP')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Top P must be between 0 and 1')
]);

/**
 * Validate model update
 */
export const validateUpdate = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid model ID'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Display name cannot exceed 150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('type')
    .optional()
    .isIn(['chat', 'completion', 'embedding', 'image', 'audio', 'other'])
    .withMessage('Invalid model type'),
  body('pricing.inputPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Input price must be a non-negative number'),
  body('pricing.outputPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Output price must be a non-negative number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
]);

/**
 * Validate model ID param
 */
export const validateModelId = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid model ID')
]);

/**
 * Validate cost calculation
 */
export const validateCostCalculation = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid model ID'),
  body('inputTokens')
    .notEmpty()
    .withMessage('Input tokens is required')
    .isInt({ min: 0 })
    .withMessage('Input tokens must be a non-negative integer'),
  body('outputTokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Output tokens must be a non-negative integer')
]);

/**
 * Validate bulk pricing update
 */
export const validateBulkPricing = validate([
  body('updates')
    .isArray({ min: 1 })
    .withMessage('Updates must be a non-empty array'),
  body('updates.*.modelId')
    .isMongoId()
    .withMessage('Invalid model ID in updates'),
  body('updates.*.pricing.inputPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Input price must be a non-negative number'),
  body('updates.*.pricing.outputPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Output price must be a non-negative number')
]);