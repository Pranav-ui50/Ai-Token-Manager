/**
 * Auth Routes
 *
 * Defines authentication endpoints.
 */

import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import registrationPaymentController from '../controllers/registrationPayment.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import authValidator from '../validators/auth.validator.js';

const router = Router();

// ===========================================
// Public Routes (No Authentication Required)
// ===========================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (free plan - direct registration)
 * @access  Public
 */
router.post(
  '/register',
  authValidator.registerValidation,
  authController.register
);

/**
 * @route   POST /api/auth/register/payment
 * @desc    Initiate registration with payment (paid plans)
 * @access  Public
 */
router.post(
  '/register/payment',
  registrationPaymentController.initiatePayment
);

/**
 * @route   POST /api/auth/register/verify-razorpay
 * @desc    Verify Razorpay payment and complete registration
 * @access  Public
 */
router.post(
  '/register/verify-razorpay',
  registrationPaymentController.verifyRazorpayPayment
);

/**
 * @route   POST /api/auth/register/complete-stripe
 * @desc    Complete Stripe registration after successful payment
 * @access  Public
 */
router.post(
  '/register/complete-stripe',
  registrationPaymentController.completeStripeRegistration
);

/**
 * @route   POST /api/auth/register/cancel
 * @desc    Cancel pending registration
 * @access  Public
 */
router.post(
  '/register/cancel',
  registrationPaymentController.cancelRegistration
);

/**
 * @route   GET /api/auth/register/pending/:id
 * @desc    Get pending registration status
 * @access  Public
 */
router.get(
  '/register/pending/:id',
  registrationPaymentController.getPendingStatus
);

/**
 * @route   POST /api/auth/register/retry-payment
 * @desc    Retry payment for pending registration
 * @access  Public
 */
router.post(
  '/register/retry-payment',
  registrationPaymentController.retryPayment
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authValidator.loginValidation,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  authValidator.refreshTokenValidation,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authValidator.forgotPasswordValidation,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  authValidator.resetPasswordValidation,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  authValidator.verifyEmailValidation,
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  authValidator.resendVerificationValidation,
  authController.resendVerification
);

/**
 * @route   POST /api/auth/verify-2fa-login
 * @desc    Verify 2FA and complete login
 * @access  Public
 */
router.post(
  '/verify-2fa-login',
  authValidator.verifyTwoFactorLoginValidation,
  authController.verifyTwoFactorLogin
);

// ===========================================
// Protected Routes (Authentication Required)
// ===========================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authMiddleware.protect,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authMiddleware.protect,
  authController.getCurrentUser
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authMiddleware.protect,
  authValidator.updateProfileValidation,
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/password',
  authMiddleware.protect,
  authValidator.changePasswordValidation,
  authController.changePassword
);

/**
 * @route   POST /api/auth/2fa/enable
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post(
  '/2fa/enable',
  authMiddleware.protect,
  authController.enableTwoFactor
);

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verify two-factor authentication
 * @access  Private
 */
router.post(
  '/2fa/verify',
  authMiddleware.protect,
  authValidator.twoFactorValidation,
  authController.verifyTwoFactor
);

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post(
  '/2fa/disable',
  authMiddleware.protect,
  authController.disableTwoFactor
);

export default router;