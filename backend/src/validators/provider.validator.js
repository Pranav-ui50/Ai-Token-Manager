/**
 * Provider Validator
 *
 * Validation schemas for provider endpoints.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Validate provider creation
 */
export const validateCreate = validate([
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Provider name is required')
    .isLength({ max: 50 })
    .withMessage('Provider name cannot exceed 50 characters'),
  body('displayName')
    .trim()
    .notEmpty()
    .withMessage('Display name is required')
    .isLength({ max: 100 })
    .withMessage('Display name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('apiEndpoint')
    .optional()
    .trim()
    .isURL()
    .withMessage('API endpoint must be a valid URL'),
  body('authType')
    .optional()
    .isIn(['api_key', 'oauth', 'custom'])
    .withMessage('Invalid auth type'),
  body('settings.supportsStreaming')
    .optional()
    .isBoolean()
    .withMessage('supportsStreaming must be a boolean'),
  body('settings.supportsVision')
    .optional()
    .isBoolean()
    .withMessage('supportsVision must be a boolean'),
  body('settings.supportsFunctionCalling')
    .optional()
    .isBoolean()
    .withMessage('supportsFunctionCalling must be a boolean'),
  body('settings.defaultMaxTokens')
    .optional()
    .isInt({ min: 1 })
    .withMessage('defaultMaxTokens must be a positive integer'),
  body('settings.requestTimeout')
    .optional()
    .isInt({ min: 1000 })
    .withMessage('requestTimeout must be at least 1000ms'),
  body('settings.rateLimitPerMinute')
    .optional()
    .isInt({ min: 1 })
    .withMessage('rateLimitPerMinute must be a positive integer')
]);

/**
 * Validate provider update
 */
export const validateUpdate = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid provider ID'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
]);

/**
 * Validate provider ID param
 */
export const validateProviderId = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid provider ID')
]);