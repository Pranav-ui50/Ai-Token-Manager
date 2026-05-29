/**
 * ApiKey Validator
 *
 * Validation middleware for API key endpoints.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

const VALID_PERMISSIONS = [
  'read:providers',
  'write:providers',
  'read:models',
  'write:models',
  'read:features',
  'write:features',
  'read:plans',
  'write:plans',
  'read:projects',
  'write:projects',
  'read:analytics',
  'read:simulations',
  'write:simulations',
  'read:integrations',
  'write:integrations',
  'admin'
];

export const apiKeyValidators = {
  /**
   * Validate create API key
   */
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('API key name is required')
      .isLength({ max: 100 })
      .withMessage('API key name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
      .custom((value) => {
        if (!value) return true;
        for (const perm of value) {
          if (!VALID_PERMISSIONS.includes(perm)) {
            throw new Error(`Invalid permission: ${perm}`);
          }
        }
        return true;
      }),

    body('scopes')
      .optional()
      .isArray()
      .withMessage('Scopes must be an array'),

    body('rateLimit.requestsPerMinute')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Requests per minute must be a positive integer'),

    body('rateLimit.requestsPerDay')
      .optional()
      .isInt({ min: 100 })
      .withMessage('Requests per day must be at least 100'),

    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        return true;
      }),

    body('allowedIps')
      .optional()
      .isArray()
      .withMessage('Allowed IPs must be an array'),

    body('allowedReferrers')
      .optional()
      .isArray()
      .withMessage('Allowed referrers must be an array'),

    validate
  ],

  /**
   * Validate update API key
   */
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid API key ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('API key name cannot exceed 100 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),

    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
      .custom((value) => {
        if (!value) return true;
        for (const perm of value) {
          if (!VALID_PERMISSIONS.includes(perm)) {
            throw new Error(`Invalid permission: ${perm}`);
          }
        }
        return true;
      }),

    body('rateLimit.requestsPerMinute')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Requests per minute must be a positive integer'),

    body('rateLimit.requestsPerDay')
      .optional()
      .isInt({ min: 100 })
      .withMessage('Requests per day must be at least 100'),

    validate
  ],

  /**
   * Validate get API keys
   */
  getForOrganization: [
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'revoked', 'expired'])
      .withMessage('Invalid status filter'),

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
   * Validate revoke API key
   */
  revoke: [
    param('id')
      .isMongoId()
      .withMessage('Invalid API key ID'),

    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters'),

    validate
  ]
};