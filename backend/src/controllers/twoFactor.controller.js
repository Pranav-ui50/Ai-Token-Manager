/**
 * Two-Factor Authentication Controller
 *
 * Handles HTTP requests for 2FA functionality.
 */

import twoFactorService from '../services/twoFactor.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class TwoFactorController {
  /**
   * Setup 2FA
   * @route GET /api/v1/2fa/setup
   */
  async setup(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await twoFactorService.setup(userId);

      res.json({
        success: true,
        data: {
          secret: result.secret,
          qrCode: result.qrCode,
          backupCodes: result.backupCodes
        },
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify and enable 2FA
   * @route POST /api/v1/2fa/verify
   */
  async verifyAndEnable(req, res, next) {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      if (!code) {
        throw new AppError('Verification code is required', 400, 'CODE_REQUIRED');
      }

      const result = await twoFactorService.verifyAndEnable(userId, code);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 2FA for login
   * @route POST /api/v1/2fa/verify-login
   */
  async verifyLogin(req, res, next) {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        throw new AppError('User ID and verification code are required', 400, 'MISSING_FIELDS');
      }

      const result = await twoFactorService.verifyForLogin(userId, code);

      res.json({
        success: true,
        data: {
          method: result.method,
          remainingBackupCodes: result.remainingCodes
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   * @route POST /api/v1/2fa/disable
   */
  async disable(req, res, next) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        throw new AppError('Password is required to disable 2FA', 400, 'PASSWORD_REQUIRED');
      }

      const result = await twoFactorService.disable(userId, password, req.user);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate backup codes
   * @route POST /api/v1/2fa/backup-codes
   */
  async regenerateBackupCodes(req, res, next) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        throw new AppError('Password is required to regenerate backup codes', 400, 'PASSWORD_REQUIRED');
      }

      const result = await twoFactorService.regenerateBackupCodes(userId, password);

      res.json({
        success: true,
        data: {
          backupCodes: result.backupCodes
        },
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get 2FA status
   * @route GET /api/v1/2fa/status
   */
  async getStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const status = await twoFactorService.getStatus(userId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TwoFactorController();