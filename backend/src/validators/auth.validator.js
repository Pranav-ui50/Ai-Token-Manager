/**
 * Auth Validator
 *
 * Validation schemas for authentication endpoints.
 */

import { body, param, query, validationResult } from 'express-validator';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Validation result handler
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg
    }));

    const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    error.details = errorMessages;
    throw error;
  }
  next();
};

/**
 * Register validation
 */
export const registerValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('organizationName')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),

  body('planId')
    .optional()
    .isIn(['free', 'starter', 'professional', 'enterprise'])
    .withMessage('Invalid plan selected'),

  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Invalid billing cycle selected'),

  validate
];

/**
 * Login validation
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  validate
];

/**
 * Refresh token validation
 */
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),

  validate
];

/**
 * Forgot password validation
 */
export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  validate
];

/**
 * Reset password validation
 */
export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  validate
];

/**
 * Change password validation
 */
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  validate
];

/**
 * Verify email validation
 */
export const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isString()
    .withMessage('Verification token must be a string'),

  validate
];

/**
 * Resend verification validation
 */
export const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  validate
];

/**
 * Update profile validation
 */
export const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL'),

  validate
];

/**
 * Two-factor authentication validation
 */
export const twoFactorValidation = [
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits')
    .isNumeric()
    .withMessage('Verification code must be numeric'),

  validate
];

/**
 * Verify 2FA login validation
 */
export const verifyTwoFactorLoginValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isLength({ min: 6, max: 8 })
    .withMessage('Verification code must be 6-8 characters')
    .isAlphanumeric()
    .withMessage('Verification code must be alphanumeric'),

  validate
];

export default {
  validate,
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  updateProfileValidation,
  twoFactorValidation,
  verifyTwoFactorLoginValidation
};