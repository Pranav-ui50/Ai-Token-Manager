/**
 * Integration Validator
 *
 * Validation middleware for integration endpoints.
 * FR-45: API Integrations
 * FR-47: Usage Synchronization
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

export const integrationValidators = {
  /**
   * Validate create integration
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Integration name is required')
      .isLength({ max: 100 })
      .withMessage('Integration name cannot exceed 100 characters'),

    body('type')
      .notEmpty()
      .withMessage('Integration type is required')
      .isIn(['openai', 'anthropic', 'stripe', 'razorpay', 'slack', 'discord', 'webhook', 'custom'])
      .withMessage('Invalid integration type'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('config.endpoint')
      .optional()
      .isURL()
      .withMessage('Endpoint must be a valid URL'),

    body('config.timeout')
      .optional()
      .isInt({ min: 1000, max: 300000 })
      .withMessage('Timeout must be between 1000 and 300000 milliseconds'),

    body('config.retry.maxAttempts')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Max retry attempts must be between 1 and 10'),

    body('sync.interval')
      .optional()
      .isInt({ min: 300000 })
      .withMessage('Sync interval must be at least 5 minutes (300000ms)'),

    validate
  ],

  /**
   * Validate update integration
   */
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid integration ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Integration name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('config.timeout')
      .optional()
      .isInt({ min: 1000, max: 300000 })
      .withMessage('Timeout must be between 1000 and 300000 milliseconds'),

    validate
  ],

  /**
   * Validate get integrations
   */
  getForOrganization: [
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'error', 'pending'])
      .withMessage('Invalid status filter'),

    query('type')
      .optional()
      .isIn(['openai', 'anthropic', 'stripe', 'razorpay', 'slack', 'discord', 'webhook', 'custom'])
      .withMessage('Invalid integration type'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    validate
  ],

  /**
   * Validate toggle status
   */
  toggleStatus: [
    param('id')
      .isMongoId()
      .withMessage('Invalid integration ID'),

    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive'])
      .withMessage('Status must be "active" or "inactive"'),

    validate
  ],

  /**
   * Validate get sync history
   */
  getSyncHistory: [
    param('id')
      .isMongoId()
      .withMessage('Invalid integration ID'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('status')
      .optional()
      .isIn(['pending', 'running', 'completed', 'failed', 'partial'])
      .withMessage('Invalid sync status'),

    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),

    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),

    validate
  ],

  /**
   * Validate update sync settings
   */
  updateSyncSettings: [
    param('id')
      .isMongoId()
      .withMessage('Invalid integration ID'),

    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean'),

    body('interval')
      .optional()
      .isInt({ min: 300000, max: 86400000 })
      .withMessage('Sync interval must be between 5 minutes (300000ms) and 24 hours (86400000ms)'),

    validate
  ],

  /**
   * Validate cancel sync
   */
  cancelSync: [
    param('id')
      .isMongoId()
      .withMessage('Invalid integration ID'),

    param('syncId')
      .matches(/^sync_\d+_[a-z0-9]+$/)
      .withMessage('Invalid sync ID format'),

    validate
  ],

  /**
   * Validate retry sync
   */
  retrySync: [
    param('id')
      .isMongoId()
      .withMessage('Invalid integration ID'),

    param('syncId')
      .isMongoId()
      .withMessage('Invalid sync ID'),

    validate
  ],

  /**
   * Validate get sync stats
   */
  getSyncStats: [
    query('startDate')
      .notEmpty()
      .withMessage('Start date is required')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),

    query('endDate')
      .notEmpty()
      .withMessage('End date is required')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),

    validate
  ]
};