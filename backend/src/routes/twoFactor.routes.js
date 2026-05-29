/**
 * Two-Factor Authentication Routes
 *
 * Routes for 2FA functionality.
 */

import express from 'express';
import twoFactorController from '../controllers/twoFactor.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation rules
const verifyCodeValidation = [
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only digits'),
  validate
];

const verifyLoginValidation = [
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

const passwordValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  validate
];

// All routes require authentication
router.use(protect);

/**
 * @route GET /api/v1/2fa/setup
 * @description Initialize 2FA setup
 * @access Private
 */
router.get('/setup', twoFactorController.setup.bind(twoFactorController));

/**
 * @route POST /api/v1/2fa/verify
 * @description Verify and enable 2FA
 * @access Private
 */
router.post('/verify', verifyCodeValidation, twoFactorController.verifyAndEnable.bind(twoFactorController));

/**
 * @route POST /api/v1/2fa/verify-login
 * @description Verify 2FA during login
 * @access Public (but requires userId in body)
 */
router.post('/verify-login', verifyLoginValidation, twoFactorController.verifyLogin.bind(twoFactorController));

/**
 * @route POST /api/v1/2fa/disable
 * @description Disable 2FA
 * @access Private
 */
router.post('/disable', passwordValidation, twoFactorController.disable.bind(twoFactorController));

/**
 * @route POST /api/v1/2fa/backup-codes
 * @description Regenerate backup codes
 * @access Private
 */
router.post('/backup-codes', passwordValidation, twoFactorController.regenerateBackupCodes.bind(twoFactorController));

/**
 * @route GET /api/v1/2fa/status
 * @description Get 2FA status
 * @access Private
 */
router.get('/status', twoFactorController.getStatus.bind(twoFactorController));

export default router;