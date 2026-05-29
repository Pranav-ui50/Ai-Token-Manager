/**
 * Two-Factor Authentication Service
 *
 * Handles TOTP-based two-factor authentication.
 */

import { authenticator, totp } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import User from '../models/User.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import emailService from './email.service.js';

class TwoFactorService {
  constructor() {
    this.issuer = process.env.TOTP_ISSUER || 'API Token Manager';
    this.backupCodeCount = 10;
    this.backupCodeLength = 8;
  }

  /**
   * Generate TOTP secret and QR code
   * @param {string} userId - User ID
   * @returns {Object} Secret, QR code, and setup info
   */
  async setup(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is already enabled', 400, '2FA_ALREADY_ENABLED');
    }

    // Generate secret
    const secret = authenticator.generateSecret(32);
    const otpauthUrl = authenticator.keyuri(user.email, this.issuer, secret);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store secret and backup codes (not enabled yet)
    user.twoFactorSecret = secret.base32;
    user.backupCodes = backupCodes.map(code => ({
      code: this.hashBackupCode(code),
      usedAt: null
    }));
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2
    });

    logger.info(`[2FA] Setup initiated for user: ${user.email}`);

    return {
      secret: secret,
      qrCode: qrCodeUrl,
      backupCodes, // Only time backup codes are shown in plain text
      message: 'Scan the QR code with your authenticator app and verify with a code to enable 2FA.'
    };
  }

  /**
   * Verify TOTP code and enable 2FA
   * @param {string} userId - User ID
   * @param {string} code - TOTP code
   * @returns {Object} Success message
   */
  async verifyAndEnable(userId, code) {
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is already enabled', 400, '2FA_ALREADY_ENABLED');
    }

    if (!user.twoFactorSecret) {
      throw new AppError('Please setup 2FA first', 400, '2FA_NOT_SETUP');
    }

    // Verify TOTP code
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'INVALID_2FA_CODE');
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendTemplateEmail({
        to: user.email,
        subject: 'Two-Factor Authentication Enabled',
        template: 'two-factor-enabled',
        data: {
          firstName: user.firstName,
          isEnabled: true,
          method: 'Authenticator App',
          changedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.warn('[2FA] Failed to send confirmation email:', error);
    }

    logger.info(`[2FA] Enabled for user: ${user.email}`);

    return {
      success: true,
      message: 'Two-factor authentication enabled successfully. Save your backup codes securely.'
    };
  }

  /**
   * Verify TOTP code for login
   * @param {string} userId - User ID
   * @param {string} code - TOTP code or backup code
   * @returns {Object} Verification result
   */
  async verifyForLogin(userId, code) {
    const user = await User.findById(userId).select('+twoFactorSecret +backupCodes');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is not enabled', 400, '2FA_NOT_ENABLED');
    }

    // First, try TOTP verification
    const isTOTPValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (isTOTPValid) {
      return { success: true, method: 'totp' };
    }

    // If TOTP fails, try backup code
    const backupResult = await this.useBackupCode(user, code);
    if (backupResult) {
      return {
        success: true,
        method: 'backup',
        remainingCodes: backupResult.remainingCodes
      };
    }

    throw new AppError('Invalid verification code', 400, 'INVALID_2FA_CODE');
  }

  /**
   * Disable 2FA
   * @param {string} userId - User ID
   * @param {string} password - User password for verification
   * @param {Object} user - User object with password
   * @returns {Object} Success message
   */
  async disable(userId, password, user) {
    if (!user) {
      user = await User.findById(userId).select('+password');
    }

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendTemplateEmail({
        to: user.email,
        subject: 'Two-Factor Authentication Disabled',
        template: 'two-factor-enabled',
        data: {
          firstName: user.firstName,
          isEnabled: false,
          method: 'Authenticator App',
          changedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.warn('[2FA] Failed to send confirmation email:', error);
    }

    logger.info(`[2FA] Disabled for user: ${user.email}`);

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully.'
    };
  }

  /**
   * Generate new backup codes
   * @param {string} userId - User ID
   * @param {string} password - User password for verification
   * @returns {Object} New backup codes
   */
  async regenerateBackupCodes(userId, password) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
    }

    if (!user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is not enabled', 400, '2FA_NOT_ENABLED');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    user.backupCodes = backupCodes.map(code => ({
      code: this.hashBackupCode(code),
      usedAt: null
    }));
    await user.save();

    logger.info(`[2FA] Backup codes regenerated for: ${user.email}`);

    return {
      backupCodes,
      message: 'New backup codes generated. Save them securely.'
    };
  }

  /**
   * Get 2FA status
   * @param {string} userId - User ID
   * @returns {Object} 2FA status
   */
  async getStatus(userId) {
    const user = await User.findById(userId).select('+backupCodes');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      enabled: user.twoFactorEnabled,
      configured: !!user.twoFactorSecret,
      remainingBackupCodes: user.backupCodes ? user.backupCodes.filter(bc => !bc.usedAt).length : 0
    };
  }

  /**
   * Verify TOTP code
   * @private
   * @param {string} secret - Base32 secret
   * @param {string} code - TOTP code
   * @returns {boolean} Is valid
   */
  verifyTOTP(secret, code) {
    try {
      return authenticator.verify({
        token: code,
        secret: secret
      });
    } catch (error) {
      logger.error('[2FA] TOTP verification error:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   * @private
   * @returns {string[]} Array of backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.backupCodeCount; i++) {
      const code = crypto.randomBytes(this.backupCodeLength)
        .toString('hex')
        .slice(0, this.backupCodeLength)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   * @private
   * @param {string} code - Backup code
   * @returns {string} Hashed code
   */
  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify and use backup code
   * @private
   * @param {Object} user - User document
   * @param {string} code - Backup code
   * @returns {Object|null} Result with remaining codes count
   */
  async useBackupCode(user, code) {
    const hashedCode = this.hashBackupCode(code.toUpperCase());
    const backupCodeIndex = user.backupCodes.findIndex(bc => bc.code === hashedCode && !bc.usedAt);

    if (backupCodeIndex === -1) {
      return null;
    }

    // Mark code as used
    user.backupCodes[backupCodeIndex].usedAt = new Date();
    await user.save();

    const remainingCodes = user.backupCodes.filter(bc => !bc.usedAt).length;

    logger.info(`[2FA] Backup code used for: ${user.email}, ${remainingCodes} codes remaining`);

    return { remainingCodes };
  }
}

export default new TwoFactorService();