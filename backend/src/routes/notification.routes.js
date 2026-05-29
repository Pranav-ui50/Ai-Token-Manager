/**
 * Notification Routes
 *
 * Routes for notification management.
 * FR-49: Pricing change notifications
 * FR-50: Low margin notifications
 * FR-51: Usage spike alerts
 */

import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import { protect, restrictTo, requirePermissions } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { notificationValidators } from '../validators/notification.validator.js';
import { PERMISSIONS } from '../utils/constants.js';

const router = Router();

// ===========================================
// All routes require authentication
// ===========================================
router.use(protect);

// ===========================================
// User Notification Routes
// ===========================================

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private
 */
router.get(
  '/',
  validate(notificationValidators.getNotifications),
  notificationController.getNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate(notificationValidators.getNotification),
  notificationController.getNotification
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  '/:id/read',
  validate(notificationValidators.markAsRead),
  notificationController.markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch(
  '/read-all',
  validate(notificationValidators.markAllAsRead),
  notificationController.markAllAsRead
);

/**
 * @route   PATCH /api/notifications/:id/dismiss
 * @desc    Dismiss notification
 * @access  Private
 */
router.patch(
  '/:id/dismiss',
  validate(notificationValidators.dismiss),
  notificationController.dismiss
);

/**
 * @route   PATCH /api/notifications/:id/resolve
 * @desc    Resolve notification
 * @access  Private
 */
router.patch(
  '/:id/resolve',
  validate(notificationValidators.resolve),
  notificationController.resolve
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:id',
  validate(notificationValidators.deleteNotification),
  notificationController.deleteNotification
);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete(
  '/read',
  notificationController.deleteAllRead
);

// ===========================================
// Bulk Operations
// ===========================================

/**
 * @route   PATCH /api/notifications/bulk/read
 * @desc    Bulk mark notifications as read
 * @access  Private
 */
router.patch(
  '/bulk/read',
  validate(notificationValidators.bulkMarkAsRead),
  notificationController.bulkMarkAsRead
);

/**
 * @route   DELETE /api/notifications/bulk
 * @desc    Bulk delete notifications
 * @access  Private
 */
router.delete(
  '/bulk',
  validate(notificationValidators.bulkDelete),
  notificationController.bulkDelete
);

// ===========================================
// Admin Trigger Routes (for system notifications)
// ===========================================

/**
 * @route   POST /api/notifications/trigger/pricing-change
 * @desc    Trigger pricing change notification
 * @access  Private (Admin/Finance)
 */
router.post(
  '/trigger/pricing-change',
  requirePermissions(PERMISSIONS.MANAGE_FEATURES, PERMISSIONS.VIEW_ANALYTICS),
  validate(notificationValidators.triggerPricingChange),
  notificationController.triggerPricingChangeNotification
);

/**
 * @route   POST /api/notifications/trigger/low-margin
 * @desc    Trigger low margin notification
 * @access  Private (Admin/Finance)
 */
router.post(
  '/trigger/low-margin',
  requirePermissions(PERMISSIONS.MANAGE_PLANS, PERMISSIONS.VIEW_ANALYTICS),
  validate(notificationValidators.triggerLowMargin),
  notificationController.triggerLowMarginNotification
);

/**
 * @route   POST /api/notifications/trigger/usage-spike
 * @desc    Trigger usage spike notification
 * @access  Private (Admin)
 */
router.post(
  '/trigger/usage-spike',
  requirePermissions(PERMISSIONS.VIEW_ANALYTICS),
  validate(notificationValidators.triggerUsageSpike),
  notificationController.triggerUsageSpikeNotification
);

/**
 * @route   POST /api/notifications/custom
 * @desc    Create custom notification (admin)
 * @access  Private (Admin/Owner)
 */
router.post(
  '/custom',
  restrictTo('super_admin', 'org_owner'),
  validate(notificationValidators.createCustom),
  notificationController.createCustomNotification
);

export default router;