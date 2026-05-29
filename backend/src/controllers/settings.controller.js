/**
 * Settings Controller
 *
 * HTTP handlers for settings endpoints.
 */

import settingsService from '../services/settings.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class SettingsController {
  // ==========================================
  // Organization Settings
  // ==========================================

  /**
   * Get organization settings
   */
  async getOrganizationSettings(req, res, next) {
    try {
      const settings = await settingsService.getOrganizationSettings(
        req.params.organizationId,
        req.user.id
      );

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(req, res, next) {
    try {
      const result = await settingsService.updateOrganizationSettings(
        req.params.organizationId,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        message: 'Organization settings updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // User Profile Settings
  // ==========================================

  /**
   * Get user profile
   */
  async getProfile(req, res, next) {
    try {
      const profile = await settingsService.getProfile(req.user.id);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res, next) {
    try {
      const result = await settingsService.updateProfile(req.user.id, req.body);

      res.json({
        success: true,
        data: result,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(req, res, next) {
    try {
      const result = await settingsService.uploadAvatar(req.user.id, req.file);

      res.json({
        success: true,
        data: result,
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Notification Settings
  // ==========================================

  /**
   * Get notification settings
   */
  async getNotificationSettings(req, res, next) {
    try {
      const settings = await settingsService.getNotificationSettings(req.user.id);

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(req, res, next) {
    try {
      const result = await settingsService.updateNotificationSettings(req.user.id, req.body);

      res.json({
        success: true,
        data: result,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Security Settings
  // ==========================================

  /**
   * Change password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const result = await settingsService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get 2FA status
   */
  async getTwoFactorStatus(req, res, next) {
    try {
      const status = await settingsService.getTwoFactorStatus(req.user.id);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Setup 2FA
   */
  async setupTwoFactor(req, res, next) {
    try {
      const result = await settingsService.setupTwoFactor(req.user.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify and enable 2FA
   */
  async verifyTwoFactor(req, res, next) {
    try {
      const { token, secret } = req.body;

      const result = await settingsService.verifyTwoFactor(
        req.user.id,
        token,
        secret
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(req, res, next) {
    try {
      const { password } = req.body;

      const result = await settingsService.disableTwoFactor(req.user.id, password);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(req, res, next) {
    try {
      const sessions = await settingsService.getActiveSessions(req.user.id);

      // Mark current session
      const currentToken = req.headers.authorization?.split(' ')[1]?.slice(0, 10);
      const sessionsWithCurrent = sessions.map(s => ({
        ...s,
        current: s.id === currentToken
      }));

      res.json({
        success: true,
        data: sessionsWithCurrent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(req, res, next) {
    try {
      const result = await settingsService.revokeSession(
        req.user.id,
        req.params.sessionId
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SettingsController();