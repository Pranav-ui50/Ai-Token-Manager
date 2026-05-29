/**
 * Notification Controller
 *
 * Handles HTTP requests for notification endpoints.
 */

import notificationService from '../services/notification.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class NotificationController {
  /**
   * Get notifications for current user
   * @route GET /api/notifications
   */
  async getNotifications(req, res, next) {
    try {
      const userId = req.user.userId;
      const { page, limit, status, type, severity } = req.query;

      const result = await notificationService.getForUser(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        type,
        severity
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notification by ID
   * @route GET /api/notifications/:id
   */
  async getNotification(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await notificationService.getById(id, userId);

      res.status(200).json({
        success: true,
        data: { notification }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread notification count
   * @route GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.userId;

      const counts = await notificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: counts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * @route PATCH /api/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await notificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * @route PATCH /api/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.userId;
      const { type, severity } = req.query;

      const result = await notificationService.markAllAsRead(userId, { type, severity });

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dismiss notification
   * @route PATCH /api/notifications/:id/dismiss
   */
  async dismiss(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await notificationService.dismiss(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification dismissed',
        data: { notification }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve notification
   * @route PATCH /api/notifications/:id/resolve
   */
  async resolve(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const resolvedBy = req.user.userId;

      const notification = await notificationService.resolve(id, userId, resolvedBy);

      res.status(200).json({
        success: true,
        message: 'Notification resolved',
        data: { notification }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   * @route DELETE /api/notifications/:id
   */
  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      await notificationService.delete(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all read notifications
   * @route DELETE /api/notifications/read
   */
  async deleteAllRead(req, res, next) {
    try {
      const userId = req.user.userId;

      const result = await notificationService.deleteAllRead(userId);

      res.status(200).json({
        success: true,
        message: 'Read notifications deleted',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk mark as read
   * @route PATCH /api/notifications/bulk/read
   */
  async bulkMarkAsRead(req, res, next) {
    try {
      const { notificationIds } = req.body;
      const userId = req.user.userId;

      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new AppError('Notification IDs array is required', 400, 'VALIDATION_ERROR');
      }

      const result = await notificationService.bulkMarkAsRead(notificationIds, userId);

      res.status(200).json({
        success: true,
        message: 'Notifications marked as read',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete notifications
   * @route DELETE /api/notifications/bulk
   */
  async bulkDelete(req, res, next) {
    try {
      const { notificationIds } = req.body;
      const userId = req.user.userId;

      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new AppError('Notification IDs array is required', 400, 'VALIDATION_ERROR');
      }

      const result = await notificationService.bulkDelete(notificationIds, userId);

      res.status(200).json({
        success: true,
        message: 'Notifications deleted',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Admin Endpoints (for triggering notifications)
  // ==========================================

  /**
   * Trigger pricing change notification
   * @route POST /api/notifications/trigger/pricing-change
   * @access Admin only
   */
  async triggerPricingChangeNotification(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { providerName, modelName, oldPrice, newPrice, modelId, effectiveDate } = req.body;

      const notifications = await notificationService.notifyPricingChange(organizationId, {
        providerName,
        modelName,
        oldPrice,
        newPrice,
        modelId,
        effectiveDate
      });

      res.status(201).json({
        success: true,
        message: 'Pricing change notifications sent',
        data: { count: notifications.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger low margin notification
   * @route POST /api/notifications/trigger/low-margin
   * @access Admin only
   */
  async triggerLowMarginNotification(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { planName, featureName, currentMargin, thresholdMargin, planId, featureId } = req.body;

      const notifications = await notificationService.notifyLowMargin(organizationId, {
        planName,
        featureName,
        currentMargin,
        thresholdMargin,
        planId,
        featureId
      });

      res.status(201).json({
        success: true,
        message: 'Low margin notifications sent',
        data: { count: notifications.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger usage spike notification
   * @route POST /api/notifications/trigger/usage-spike
   * @access Admin only
   */
  async triggerUsageSpikeNotification(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { featureName, normalUsage, currentUsage, spikePercent, featureId } = req.body;

      const notifications = await notificationService.notifyUsageSpike(organizationId, {
        featureName,
        normalUsage,
        currentUsage,
        spikePercent,
        featureId
      });

      res.status(201).json({
        success: true,
        message: 'Usage spike notifications sent',
        data: { count: notifications.length }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create custom notification (admin)
   * @route POST /api/notifications/custom
   * @access Admin only
   */
  async createCustomNotification(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { userIds, title, message, severity, type, resource, actions, priority } = req.body;

      // If userIds not provided, notify all admins
      const targetUserIds = userIds || await notificationService.getOrganizationAdminIds(organizationId);

      const notifications = await notificationService.createForUsers(organizationId, targetUserIds, {
        type: type || 'system',
        title,
        message,
        severity: severity || 'info',
        resource,
        actions: actions || [],
        priority: priority || 5,
        createdBy: req.user.userId
      });

      res.status(201).json({
        success: true,
        message: 'Custom notifications created',
        data: { count: notifications.length }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();