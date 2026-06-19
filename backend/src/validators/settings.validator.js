/**
 * Settings Validator
 *
 * Validation schemas for settings endpoints.
 */

import { body, param } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Validate organization ID param
 */
export const validateOrgId = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID')
]);

/**
 * Validate organization settings update
 */
export const validateOrganizationSettings = validate([
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('name')
    .exists()
    .withMessage('Organization name is required')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('website')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      // Skip validation for empty values
      if (!value || value.trim() === '') return true;
      // Simple URL validation - just check if it looks like a URL
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        throw new Error('Invalid website URL. Must be a valid URL with http:// or https://');
      }
    }),
  body('industry')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      const validIndustries = ['technology', 'healthcare', 'finance', 'education', 'retail', 'other'];
      if (!validIndustries.includes(value)) {
        throw new Error('Invalid industry. Must be one of: technology, healthcare, finance, education, retail, other');
      }
      return true;
    }),
  body('settings.currency')
    .optional({ values: 'falsy' })
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),
  body('settings.timezone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invalid timezone'),
  body('settings.dateFormat')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
    .withMessage('Invalid date format')
]);

/**
 * Validate profile settings update
 */
export const validateProfileSettings = validate([
  body('firstName')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .escape(),
  body('phone')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid avatar URL')
]);

/**
 * Validate password change
 */
export const validatePasswordChange = validate([
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8, max: 50 })
    .withMessage('Password must be between 8 and 50 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
]);

/**
 * Validate notification settings update
 */
export const validateNotificationSettings = validate([
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be a boolean'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('pushNotifications must be a boolean'),
  body('weeklyReport')
    .optional()
    .isBoolean()
    .withMessage('weeklyReport must be a boolean'),
  body('billingAlerts')
    .optional()
    .isBoolean()
    .withMessage('billingAlerts must be a boolean'),
  body('memberInvites')
    .optional()
    .isBoolean()
    .withMessage('memberInvites must be a boolean'),
  body('securityAlerts')
    .optional()
    .isBoolean()
    .withMessage('securityAlerts must be a boolean'),
  body('pricingChanges')
    .optional()
    .isBoolean()
    .withMessage('pricingChanges must be a boolean'),
  body('lowMargins')
    .optional()
    .isBoolean()
    .withMessage('lowMargins must be a boolean'),
  body('usageSpikes')
    .optional()
    .isBoolean()
    .withMessage('usageSpikes must be a boolean')
]);

/**
 * Validate 2FA setup verification
 */
export const validateTwoFactorSetup = validate([
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Token must be 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('Token must contain only digits'),
  body('secret')
    .notEmpty()
    .withMessage('Secret is required')
]);

/**
 * Validate session ID param
 */
export const validateSessionId = validate([
  param('sessionId')
    .isMongoId()
    .withMessage('Invalid session ID')
]);