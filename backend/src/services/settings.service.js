/**
 * Settings Service
 *
 * Handles user and organization settings business logic.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';
import { generateToken } from '../utils/jwt.js';

// OTP library for 2FA (optional dependency)
let authenticator = null;
try {
  authenticator = (await import('otplib')).authenticator;
} catch (e) {
  logger.warn('otplib not installed - 2FA features will be limited');
}

class SettingsService {
  // ==========================================
  // Organization Settings
  // ==========================================

  /**
   * Get organization settings
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Organization settings
   */
  async getOrganizationSettings(organizationId, userId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return {
      id: organization._id,
      name: organization.name,
      description: organization.description,
      logo: organization.logo,
      website: organization.website,
      industry: organization.industry,
      settings: organization.settings,
      billingDetails: organization.billingDetails,
      subscription: organization.subscription
    };
  }

  /**
   * Update organization settings
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Settings data
   * @param {string} userId - User ID
   * @returns {Object} Updated organization
   */
  async updateOrganizationSettings(organizationId, data, userId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can update settings', 403, 'FORBIDDEN');
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'logo', 'website', 'industry'];
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        organization[field] = data[field];
      }
    });

    // Update nested settings
    if (data.settings) {
      organization.settings = {
        ...organization.settings?.toObject(),
        ...data.settings
      };
    }

    await organization.save();

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      user: userId,
      action: 'organization_settings_updated',
      resourceType: 'organization',
      resourceId: organization._id,
      resourceName: organization.name,
      description: 'Organization settings updated'
    });

    logger.info(`Organization settings updated: ${organizationId} by ${userId}`);

    return organization;
  }

  // ==========================================
  // User Profile Settings
  // ==========================================

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Object} User profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId)
      .select('-password -refreshTokens -twoFactorSecret');

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      organization: user.organization,
      preferences: user.preferences,
      createdAt: user.createdAt
    };
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} data - Profile data
   * @returns {Object} Updated user
   */
  async updateProfile(userId, data) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Update allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'avatar'];
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        user[field] = data[field];
      }
    });

    await user.save();

    // Log audit
    await AuditLog.log({
      user: userId,
      action: 'profile_updated',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: `${user.firstName} ${user.lastName}`,
      description: 'User profile updated'
    });

    logger.info(`User profile updated: ${userId}`);

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar
    };
  }

  /**
   * Upload avatar
   * @param {string} userId - User ID
   * @param {Object} file - Uploaded file
   * @returns {Object} Avatar URL
   */
  async uploadAvatar(userId, file) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // In production, upload to S3/Cloudinary
    // For now, generate a placeholder URL
    const avatarUrl = file?.location || file?.path || `/uploads/avatars/${userId}.jpg`;

    user.avatar = avatarUrl;
    await user.save();

    logger.info(`Avatar uploaded: ${userId}`);

    return { avatar: avatarUrl };
  }

  // ==========================================
  // Notification Settings
  // ==========================================

  /**
   * Get notification settings
   * @param {string} userId - User ID
   * @returns {Object} Notification settings
   */
  async getNotificationSettings(userId) {
    const user = await User.findById(userId).select('preferences.notifications');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return user.preferences?.notifications || {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReport: true,
      billingAlerts: true,
      memberInvites: true,
      securityAlerts: true,
      pricingChanges: true,
      lowMargins: true,
      usageSpikes: true
    };
  }

  /**
   * Update notification settings
   * @param {string} userId - User ID
   * @param {Object} settings - Notification settings
   * @returns {Object} Updated settings
   */
  async updateNotificationSettings(userId, settings) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }

    user.preferences.notifications = {
      ...user.preferences.notifications,
      ...settings
    };

    await user.save();

    logger.info(`Notification settings updated: ${userId}`);

    return user.preferences.notifications;
  }

  // ==========================================
  // Security Settings
  // ==========================================

  /**
   * Change password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Check new password is different
    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
    }

    // Hash and update password
    user.password = await hashPassword(newPassword);

    // Clear all refresh tokens (force re-login on all devices)
    user.refreshTokens = [];

    await user.save();

    // Log audit
    await AuditLog.log({
      user: userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: user._id,
      description: 'Password changed successfully'
    });

    logger.info(`Password changed: ${userId}`);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  /**
   * Get 2FA status
   * @param {string} userId - User ID
   * @returns {Object} 2FA status
   */
  async getTwoFactorStatus(userId) {
    const user = await User.findById(userId).select('twoFactorEnabled twoFactorSecret');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      enabled: user.twoFactorEnabled || false,
      configured: !!user.twoFactorSecret
    };
  }

  /**
   * Setup 2FA
   * @param {string} userId - User ID
   * @returns {Object} 2FA setup data
   */
  async setupTwoFactor(userId) {
    if (!authenticator) {
      throw new AppError('Two-factor authentication is not available', 503, 'FEATURE_UNAVAILABLE');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Store secret temporarily (not enabled until verified)
    user.twoFactorSecret = secret;
    await user.save();

    // Generate QR code URL
    const serviceName = process.env.APP_NAME || 'API Token Manager';
    const otpauth = authenticator.keyuri(user.email, serviceName, secret);

    logger.info(`2FA setup initiated: ${userId}`);

    return {
      secret,
      qrCodeUrl: otpauth,
      manualEntryKey: secret
    };
  }

  /**
   * Verify and enable 2FA
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @param {string} secret - 2FA secret
   * @returns {Object} Success message
   */
  async verifyTwoFactor(userId, token, secret) {
    if (!authenticator) {
      throw new AppError('Two-factor authentication is not available', 503, 'FEATURE_UNAVAILABLE');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Verify token
    const isValid = authenticator.check(token, secret);
    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'INVALID_TOKEN');
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await user.save();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Log audit
    await AuditLog.log({
      user: userId,
      action: '2fa_enabled',
      resourceType: 'user',
      resourceId: user._id,
      description: 'Two-factor authentication enabled'
    });

    logger.info(`2FA enabled: ${userId}`);

    return {
      message: 'Two-factor authentication enabled successfully',
      backupCodes
    };
  }

  /**
   * Disable 2FA
   * @param {string} userId - User ID
   * @param {string} password - User password for verification
   * @returns {Object} Success message
   */
  async disableTwoFactor(userId, password) {
    const user = await User.findById(userId).select('+password +twoFactorSecret');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Verify password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new AppError('Password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    // Log audit
    await AuditLog.log({
      user: userId,
      action: '2fa_disabled',
      resourceType: 'user',
      resourceId: user._id,
      description: 'Two-factor authentication disabled'
    });

    logger.info(`2FA disabled: ${userId}`);

    return { message: 'Two-factor authentication disabled successfully' };
  }

  /**
   * Get active sessions
   * @param {string} userId - User ID
   * @returns {Array} Active sessions
   */
  async getActiveSessions(userId) {
    const user = await User.findById(userId).select('refreshTokens');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Get all refresh tokens with session info
    const sessions = (user.refreshTokens || []).map(token => ({
      id: token._id || token.token?.slice(0, 10),
      device: token.device || 'Unknown device',
      browser: token.browser || 'Unknown browser',
      os: token.os || 'Unknown OS',
      ip: token.ip || 'Unknown IP',
      lastUsed: token.lastUsed || token.createdAt,
      createdAt: token.createdAt,
      current: false // Will be set by controller based on current token
    }));

    return sessions;
  }

  /**
   * Revoke session
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID to revoke
   * @returns {Object} Success message
   */
  async revokeSession(userId, sessionId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Remove refresh token
    user.refreshTokens = user.refreshTokens.filter(
      token => (token._id?.toString() || token.token?.slice(0, 10)) !== sessionId
    );

    await user.save();

    logger.info(`Session revoked: ${sessionId} for user ${userId}`);

    return { message: 'Session revoked successfully' };
  }

  /**
   * Generate backup codes for 2FA
   * @returns {Array} Backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

export default new SettingsService();