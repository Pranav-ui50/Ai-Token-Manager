/**
 * Authentication Service
 *
 * Handles all authentication-related business logic.
 */

import crypto from 'crypto';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Organization from '../models/Organization.js';
import PasswordReset from '../models/PasswordReset.js';
import EmailVerification from '../models/EmailVerification.js';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { generateToken, generateNumericCode } from '../utils/encryption.js';
import { AppError } from '../middlewares/error.middleware.js';
import config from '../config/index.js';
import logger from '../config/logger.js';
import emailService from './email.service.js';

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user, tokens, and verification token
   */
  async register(userData) {
    const { email, password, firstName, lastName, organizationName } = userData;

    logger.info(`[Auth] Register attempt for email: ${email}`);

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      logger.warn(`[Auth] Registration failed - User already exists: ${email}`);
      throw new AppError('User with this email already exists', 409, 'DUPLICATE_ERROR');
    }

    // Get org_owner role (instead of viewer)
    const orgOwnerRole = await Role.findOne({ name: 'org_owner' });
    if (!orgOwnerRole) {
      logger.error('[Auth] Registration failed - Org Owner role not found');
      throw new AppError('System configuration error. Please contact support.', 500, 'SYSTEM_ERROR');
    }

    // Create user with org_owner role
    // Note: Using simple create() instead of transactions for standalone MongoDB compatibility
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: orgOwnerRole._id,
      isVerified: false,
      isActive: true
    });

    logger.info(`[Auth] User created: ${user._id}`);

    // Create organization if organizationName is provided
    let organization = null;
    if (organizationName) {
      try {
        organization = await Organization.create({
          name: organizationName,
          owner: user._id,
          members: [{
            user: user._id,
            role: orgOwnerRole._id,
            joinedAt: new Date()
          }],
          isActive: true
        });

        logger.info(`[Auth] Organization created: ${organization._id}`);

        // Update user with organization reference
        user.organization = organization._id;
        await user.save();
      } catch (orgError) {
        // If organization creation fails, delete the user to maintain consistency
        logger.error('[Auth] Organization creation failed, cleaning up user:', orgError);
        await User.findByIdAndDelete(user._id);
        throw new AppError('Failed to create organization. Please try again.', 500, 'ORG_CREATION_FAILED');
      }
    }

    // Populate role and organization
    await user.populate('role');
    await user.populate('organization');

    // Generate email verification token
    const verificationToken = await EmailVerification.createToken(user._id, user.email);

    // Generate verification URL
    const verificationUrl = `${config.client.url}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await emailService.sendVerificationEmail({
        email: user.email,
        verificationToken,
        verificationUrl
      });
      logger.info(`[Auth] Verification email sent to: ${user.email}`);
    } catch (error) {
      logger.error('[Auth] Failed to send verification email:', error);
      // Continue even if email fails - user can request resend
    }

    // Generate tokens for auto-login
    const { accessToken, refreshToken, expiresIn } = generateTokens(user);

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    logger.info(`[Auth] Registration successful: ${user.email}`);

    return {
      user: userObj,
      accessToken,
      refreshToken,
      expiresIn,
      verificationToken: config.nodeEnv === 'development' ? verificationToken : undefined
    };
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Additional options
   * @returns {Object} User and tokens
   */
  async login(email, password, options = {}) {
    const { ipAddress, userAgent } = options;

    logger.info(`[Auth] Login attempt for email: ${email}`);
    logger.debug(`[Auth] Login options:`, { ipAddress, userAgent });

    // Find user with password
    const user = await User.findByEmail(email).select('+password +role');

    // Check if user exists
    if (!user) {
      logger.warn(`[Auth] Login failed - User not found: ${email}`);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    logger.debug(`[Auth] User found: ${user._id}, active: ${user.isActive}`);

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`[Auth] Login failed - Account deactivated: ${email}`);
      throw new AppError('Your account has been deactivated. Please contact support.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Check if account is locked
    if (user.isLocked()) {
      logger.warn(`[Auth] Login failed - Account locked: ${email}`);
      throw new AppError(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
        401,
        'ACCOUNT_LOCKED'
      );
    }

    // Compare password
    logger.debug(`[Auth] Comparing password for user: ${user._id}`);
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
      logger.debug(`[Auth] Password comparison result: ${isMatch}`);
    } catch (error) {
      logger.error('[Auth] Password comparison error:', error);
      throw new AppError('Authentication failed. Please try again.', 500, 'AUTH_ERROR');
    }

    if (!isMatch) {
      logger.warn(`[Auth] Login failed - Invalid password for: ${email}`);
      // Increment login attempts
      await user.incrementLoginAttempts();
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if email is verified (skip in development)
    if (!user.isVerified && config.features.enableRegistration && config.nodeEnv !== 'development') {
      logger.warn(`[Auth] Login failed - Email not verified: ${email}`);
      throw new AppError(
        'Please verify your email address before logging in. Check your inbox for the verification link.',
        401,
        'EMAIL_NOT_VERIFIED'
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      logger.info(`[Auth] 2FA required for user: ${email}`);
      return {
        requiresTwoFactor: true,
        userId: user._id,
        message: 'Two-factor authentication required'
      };
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    // Populate role and organization
    await user.populate('role');
    await user.populate('organization');

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.twoFactorSecret;

    logger.info(`[Auth] Login successful: ${email}`);

    return {
      user: userObj,
      ...tokens
    };
  }

  /**
   * Logout user
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async logout(userId) {
    logger.info(`[Auth] User logged out: ${userId}`);
    return true;
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New tokens
   */
  async refreshToken(refreshToken) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      logger.warn('[Auth] Token refresh failed - Invalid refresh token');
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Find user
    const user = await User.findById(decoded.userId).populate('role').populate('organization');
    if (!user) {
      logger.warn(`[Auth] Token refresh failed - User not found: ${decoded.userId}`);
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`[Auth] Token refresh failed - Account deactivated: ${user.email}`);
      throw new AppError('Account has been deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    logger.info(`[Auth] Token refreshed for user: ${user.email}`);

    return tokens;
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @param {Object} options - Additional options
   * @returns {Object} Success message
   */
  async requestPasswordReset(email, options = {}) {
    const { ipAddress, userAgent } = options;

    logger.info(`[Auth] Password reset requested for: ${email}`);

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      logger.warn(`[Auth] Password reset requested for non-existent email: ${email}`);
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`[Auth] Password reset failed - Account deactivated: ${email}`);
      throw new AppError('Account has been deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Invalidate existing tokens
    await PasswordReset.invalidateUserTokens(user._id);

    // Create new reset token
    const resetToken = await PasswordReset.createToken(user._id, user.email, ipAddress, userAgent);

    // Generate reset URL
    const resetUrl = `${config.client.url}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email
    try {
      await emailService.sendPasswordResetEmail({
        email: user.email,
        resetToken,
        resetUrl
      });

      logger.info(`[Auth] Password reset email sent to: ${user.email}`);
    } catch (error) {
      logger.error('[Auth] Failed to send password reset email:', error);
      // In development, still return the token for testing
      if (config.nodeEnv === 'development') {
        return {
          message: 'If the email exists, a password reset link has been sent.',
          resetToken,
          resetUrl,
          emailError: error.message
        };
      }
      // In production, don't reveal the error
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    return {
      message: 'If the email exists, a password reset link has been sent.',
      // In development, return the token for testing
      resetToken: config.nodeEnv === 'development' ? resetToken : undefined,
      resetLink: config.nodeEnv === 'development' ? resetUrl : undefined
    };
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} email - User email
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async resetPassword(token, email, newPassword) {
    logger.info(`[Auth] Password reset attempt for: ${email}`);

    // Verify token
    const resetRecord = await PasswordReset.verifyToken(token, email);
    if (!resetRecord) {
      logger.warn(`[Auth] Password reset failed - Invalid token for: ${email}`);
      throw new AppError('Invalid or expired reset token. Please request a new password reset.', 400, 'INVALID_RESET_TOKEN');
    }

    const user = resetRecord.user;

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Mark token as used
    await resetRecord.markAsUsed();

    // Invalidate all reset tokens for this user
    await PasswordReset.invalidateUserTokens(user._id);

    logger.info(`[Auth] Password reset successful for: ${user.email}`);

    return { message: 'Password has been reset successfully. You can now log in with your new password.' };
  }

  /**
   * Change password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    logger.info(`[Auth] Password change attempt for user: ${userId}`);

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      logger.warn(`[Auth] Password change failed - User not found: ${userId}`);
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn(`[Auth] Password change failed - Invalid current password for: ${userId}`);
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info(`[Auth] Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully' };
  }

  /**
   * Verify email
   * @param {string} token - Verification token
   * @returns {Object} Success message
   */
  async verifyEmail(token) {
    logger.info('[Auth] Email verification attempt');

    // Verify token
    const verificationRecord = await EmailVerification.verifyToken(token);
    if (!verificationRecord) {
      logger.warn('[Auth] Email verification failed - Invalid token');
      throw new AppError('Invalid or expired verification token. Please request a new verification link.', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    const user = verificationRecord.user;

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Mark verification as used
    await verificationRecord.markAsVerified();

    logger.info(`[Auth] Email verified for: ${user.email}`);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Object} Success message
   */
  async resendVerification(email) {
    logger.info(`[Auth] Resend verification for: ${email}`);

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists and is not verified, a new verification link has been sent.' };
    }

    // Check if already verified
    if (user.isVerified) {
      throw new AppError('Email is already verified', 400, 'ALREADY_VERIFIED');
    }

    // Create new verification token
    const verificationToken = await EmailVerification.createToken(user._id, user.email);

    logger.info(`[Auth] Verification email resent for: ${user.email}`);

    // In production, send email
    return {
      message: 'If the email exists and is not verified, a new verification link has been sent.',
      verificationToken // Remove in production
    };
  }

  /**
   * Get current user
   * @param {string} userId - User ID
   * @returns {Object} User object
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId)
      .populate('role')
      .populate('organization');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async updateProfile(userId, updateData) {
    const allowedUpdates = ['firstName', 'lastName', 'avatar'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .populate('role')
      .populate('organization');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    logger.info(`[Auth] Profile updated for: ${user.email}`);

    return user;
  }

  /**
   * Enable two-factor authentication
   * @param {string} userId - User ID
   * @returns {Object} 2FA setup info
   */
  async enableTwoFactor(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate 2FA secret
    const secret = generateToken(32);

    user.twoFactorSecret = secret;
    await user.save();

    // Generate QR code URL
    const qrCodeUrl = `otpauth://totp/${config.otp.issuer}:${user.email}?secret=${secret}&issuer=${config.otp.issuer}`;

    logger.info(`[Auth] 2FA enabled for: ${user.email}`);

    return {
      secret,
      qrCodeUrl,
      message: 'Two-factor authentication setup initiated. Please verify with your authenticator app.'
    };
  }

  /**
   * Verify two-factor authentication code
   * @param {string} userId - User ID
   * @param {string} code - 2FA code
   * @returns {Object} Success message
   */
  async verifyTwoFactor(userId, code) {
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify TOTP code (in production, use otplib)
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      throw new AppError('Invalid two-factor authentication code', 400, 'INVALID_2FA_CODE');
    }

    // Mark 2FA as enabled
    user.twoFactorEnabled = true;
    await user.save();

    logger.info(`[Auth] 2FA verified for: ${user.email}`);

    return { message: 'Two-factor authentication enabled successfully' };
  }

  /**
   * Disable two-factor authentication
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async disableTwoFactor(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    logger.info(`[Auth] 2FA disabled for: ${user.email}`);

    return { message: 'Two-factor authentication disabled successfully' };
  }

  /**
   * Verify 2FA and complete login
   * @param {string} userId - User ID
   * @param {string} code - TOTP code or backup code
   * @param {Object} options - Additional options
   * @returns {Object} User and tokens
   */
  async verifyTwoFactorLogin(userId, code, options = {}) {
    const { ipAddress, userAgent } = options;

    logger.info(`[Auth] 2FA login verification for user: ${userId}`);

    // Find user
    const user = await User.findById(userId)
      .select('+twoFactorSecret +backupCodes')
      .populate('role')
      .populate('organization');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 401, 'ACCOUNT_DEACTIVATED');
    }

    if (!user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is not enabled for this account', 400, '2FA_NOT_ENABLED');
    }

    // Verify TOTP code
    const { authenticator } = await import('otplib');
    let isValid = false;
    let method = 'totp';

    // Try TOTP first
    try {
      isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorSecret
      });
    } catch (error) {
      logger.warn('[Auth] TOTP verification error:', error);
    }

    // If TOTP fails, try backup code
    if (!isValid && user.backupCodes && user.backupCodes.length > 0) {
      const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
      const backupCodeIndex = user.backupCodes.findIndex(bc => bc.code === hashedCode && !bc.usedAt);

      if (backupCodeIndex !== -1) {
        isValid = true;
        method = 'backup';
        // Mark backup code as used
        user.backupCodes[backupCodeIndex].usedAt = new Date();
        await user.save();
      }
    }

    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'INVALID_2FA_CODE');
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    // Return user without sensitive data
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.twoFactorSecret;
    delete userObj.backupCodes;

    logger.info(`[Auth] 2FA login successful: ${user.email}, method: ${method}`);

    return {
      user: userObj,
      ...tokens,
      method
    };
  }
}

export default new AuthService();