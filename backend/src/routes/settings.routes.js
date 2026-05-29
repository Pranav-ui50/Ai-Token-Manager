/**
 * Settings Routes
 *
 * Routes for user and organization settings management.
 */

import express from 'express';
import settingsController from '../controllers/settings.controller.js';
import { protect, checkOrganization } from '../middlewares/auth.middleware.js';
import {
  validateOrganizationSettings,
  validateProfileSettings,
  validatePasswordChange,
  validateNotificationSettings,
  validateTwoFactorSetup,
  validateOrgId
} from '../validators/settings.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ===========================================
// Organization Settings
// ===========================================

/**
 * @route   GET /api/settings/organization/:organizationId
 * @desc    Get organization settings
 * @access  Private (Organization members)
 */
router.get(
  '/organization/:organizationId',
  validateOrgId,
  checkOrganization('organizationId'),
  settingsController.getOrganizationSettings
);

/**
 * @route   PUT /api/settings/organization/:organizationId
 * @desc    Update organization settings
 * @access  Private (Owner only)
 */
router.put(
  '/organization/:organizationId',
  validateOrganizationSettings,
  checkOrganization('organizationId'),
  settingsController.updateOrganizationSettings
);

// ===========================================
// User Profile Settings
// ===========================================

/**
 * @route   GET /api/settings/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/profile',
  settingsController.getProfile
);

/**
 * @route   PUT /api/settings/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  validateProfileSettings,
  settingsController.updateProfile
);

/**
 * @route   POST /api/settings/profile/avatar
 * @desc    Upload profile avatar
 * @access  Private
 */
router.post(
  '/profile/avatar',
  settingsController.uploadAvatar
);

// ===========================================
// Notification Settings
// ===========================================

/**
 * @route   GET /api/settings/notifications
 * @desc    Get notification settings
 * @access  Private
 */
router.get(
  '/notifications',
  settingsController.getNotificationSettings
);

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.put(
  '/notifications',
  validateNotificationSettings,
  settingsController.updateNotificationSettings
);

// ===========================================
// Security Settings
// ===========================================

/**
 * @route   PUT /api/settings/security/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/security/password',
  validatePasswordChange,
  settingsController.changePassword
);

/**
 * @route   GET /api/settings/security/2fa
 * @desc    Get 2FA status
 * @access  Private
 */
router.get(
  '/security/2fa',
  settingsController.getTwoFactorStatus
);

/**
 * @route   POST /api/settings/security/2fa/setup
 * @desc    Setup 2FA
 * @access  Private
 */
router.post(
  '/security/2fa/setup',
  settingsController.setupTwoFactor
);

/**
 * @route   POST /api/settings/security/2fa/verify
 * @desc    Verify and enable 2FA
 * @access  Private
 */
router.post(
  '/security/2fa/verify',
  validateTwoFactorSetup,
  settingsController.verifyTwoFactor
);

/**
 * @route   DELETE /api/settings/security/2fa
 * @desc    Disable 2FA
 * @access  Private
 */
router.delete(
  '/security/2fa',
  settingsController.disableTwoFactor
);

/**
 * @route   GET /api/settings/security/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get(
  '/security/sessions',
  settingsController.getActiveSessions
);

/**
 * @route   DELETE /api/settings/security/sessions/:sessionId
 * @desc    Revoke session
 * @access  Private
 */
router.delete(
  '/security/sessions/:sessionId',
  settingsController.revokeSession
);

export default router;