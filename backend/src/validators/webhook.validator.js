/**
 * Webhook Validator
 *
 * Validation middleware for webhook endpoints.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

const WEBHOOK_EVENTS = [
  'provider.created', 'provider.updated', 'provider.deleted',
  'model.created', 'model.updated', 'model.deleted',
  'feature.created', 'feature.updated', 'feature.deleted',
  'plan.created', 'plan.updated', 'plan.deleted',
  'project.created', 'project.updated', 'project.deleted',
  'pricing.changed', 'pricing.alert',
  'simulation.started', 'simulation.completed', 'simulation.failed',
  'analytics.threshold_reached', 'analytics.cost_spike',
  'integration.connected', 'integration.disconnected', 'integration.error',
  'user.registered', 'user.invited',
  'organization.created', 'organization.updated'
];

export const webhookValidators = {
  /**
   * Validate create webhook
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Webhook name is required')
      .isLength({ max: 100 })
      .withMessage('Webhook name cannot exceed 100 characters'),

    body('url')
      .trim()
      .notEmpty()
      .withMessage('Webhook URL is required')
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid webhook URL'),

    body('events')
      .isArray({ min: 1 })
      .withMessage('At least one event must be selected')
      .custom((value) => {
        for (const event of value) {
          if (!WEBHOOK_EVENTS.includes(event)) {
            throw new Error(`Invalid event: ${event}`);
          }
        }
        return true;
      }),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('method')
      .optional()
      .isIn(['GET', 'POST', 'PUT', 'PATCH'])
      .withMessage('Invalid HTTP method'),

    body('timeout')
      .optional()
      .isInt({ min: 1000, max: 60000 })
      .withMessage('Timeout must be between 1000 and 60000 milliseconds'),

    body('retry.maxAttempts')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Max retry attempts must be between 1 and 10'),

    body('auth.type')
      .optional()
      .isIn(['none', 'basic', 'bearer', 'hmac', 'api_key'])
      .withMessage('Invalid authentication type'),

    validate
  ],

  /**
   * Validate update webhook
   */
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid webhook ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Webhook name cannot exceed 100 characters'),

    body('url')
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid webhook URL'),

    body('events')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one event must be selected')
      .custom((value) => {
        if (!value) return true;
        for (const event of value) {
          if (!WEBHOOK_EVENTS.includes(event)) {
            throw new Error(`Invalid event: ${event}`);
          }
        }
        return true;
      }),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('timeout')
      .optional()
      .isInt({ min: 1000, max: 60000 })
      .withMessage('Timeout must be between 1000 and 60000 milliseconds'),

    validate
  ],

  /**
   * Validate get webhooks
   */
  getForOrganization: [
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'failing', 'disabled'])
      .withMessage('Invalid status filter'),

    query('event')
      .optional()
      .isIn(WEBHOOK_EVENTS)
      .withMessage('Invalid event filter'),

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
      .withMessage('Invalid webhook ID'),

    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive', 'disabled'])
      .withMessage('Status must be "active", "inactive", or "disabled"'),

    validate
  ]
};