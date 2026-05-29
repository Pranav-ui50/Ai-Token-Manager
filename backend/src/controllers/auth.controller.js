/**
 * Auth Controller
 *
 * Handles HTTP requests for authentication endpoints.
 */

import authService from '../services/auth.service.js';
import auditService from '../services/audit.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import config from '../config/index.js';

class AuthController {
  /**
   * Register a new user
   * @route POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, organizationName } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        organizationName
      });

      // In production, send verification email
      // For now, return the token
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          verificationToken: config.nodeEnv === 'development' ? result.verificationToken : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * @route POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await authService.login(email, password, {
        ipAddress,
        userAgent
      });

      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        return res.status(200).json({
          success: true,
          message: 'Two-factor authentication required',
          data: {
            requiresTwoFactor: true,
            userId: result.userId
          }
        });
      }

      // Log successful login
      await auditService.logSuccess({
        organization: result.user.organization?._id || result.user.organization || null,
        user: result.user._id,
        action: 'login',
        resourceType: 'auth',
        description: `User ${result.user.email} logged in successfully`,
        context: {
          ipAddress,
          userAgent,
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      // Log failed login attempt
      await auditService.logFailure({
        organization: null,
        user: null,
        action: 'login_failed',
        resourceType: 'auth',
        description: `Failed login attempt for ${req.body?.email || 'unknown'}`,
        error,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      }).catch(() => {});

      next(error);
    }
  }

  /**
   * Logout user
   * @route POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      const organization = req.user.organization;

      await authService.logout(userId);

      // Log logout
      await auditService.logSuccess({
        organization,
        user: userId,
        action: 'logout',
        resourceType: 'auth',
        description: 'User logged out',
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * @route POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   * @route POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await authService.requestPasswordReset(email, {
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: true,
        message: result.message,
        // In development, return the token for testing
        resetToken: config.nodeEnv === 'development' ? result.resetToken : undefined,
        resetLink: config.nodeEnv === 'development'
          ? `${config.client.url}/reset-password?token=${result.resetToken}&email=${encodeURIComponent(email)}`
          : undefined
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   * @route POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, email, password } = req.body;

      const result = await authService.resetPassword(token, email, password);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * @route PUT /api/auth/password
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   * @route POST /api/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      const result = await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   * @route POST /api/auth/resend-verification
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;

      const result = await authService.resendVerification(email);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   * @route GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.userId;

      const user = await authService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update profile
   * @route PUT /api/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const { firstName, lastName, avatar } = req.body;

      const user = await authService.updateProfile(userId, {
        firstName,
        lastName,
        avatar
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable two-factor authentication
   * @route POST /api/auth/2fa/enable
   */
  async enableTwoFactor(req, res, next) {
    try {
      const userId = req.user.userId;

      const result = await authService.enableTwoFactor(userId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify two-factor authentication
   * @route POST /api/auth/2fa/verify
   */
  async verifyTwoFactor(req, res, next) {
    try {
      const userId = req.user.userId;
      const { code } = req.body;

      const result = await authService.verifyTwoFactor(userId, code);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable two-factor authentication
   * @route POST /api/auth/2fa/disable
   */
  async disableTwoFactor(req, res, next) {
    try {
      const userId = req.user.userId;

      const result = await authService.disableTwoFactor(userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 2FA and complete login
   * @route POST /api/auth/verify-2fa-login
   */
  async verifyTwoFactorLogin(req, res, next) {
    try {
      const { userId, code } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await authService.verifyTwoFactorLogin(userId, code, {
        ipAddress,
        userAgent
      });

      // Log successful login
      await auditService.logSuccess({
        organization: result.user.organization?._id || result.user.organization || null,
        user: result.user._id,
        action: 'login',
        resourceType: 'auth',
        description: `User ${result.user.email} logged in with 2FA`,
        context: {
          ipAddress,
          userAgent,
          requestMethod: req.method,
          requestPath: req.path,
          metadata: { twoFactorMethod: result.method }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();