/**
 * Notification Service
 *
 * Handles notification creation, retrieval, and management.
 * FR-49: Pricing change notifications
 * FR-50: Low margin notifications
 * FR-51: Usage spike alerts
 */

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class NotificationService {
  // ==========================================
  // Create Notifications
  // ==========================================

  /**
   * Create a notification for a user
   * @param {Object} data - Notification data
   * @returns {Object} Created notification
   */
  async create(data) {
    const { organizationId, userId, type, title, message, severity = 'info', resource = null, data: payload = {}, actions = [], priority = 5 } = data;

    const notification = await Notification.create({
      organization: organizationId,
      user: userId,
      type,
      title,
      message,
      severity,
      resource,
      data: payload,
      actions,
      priority,
      createdBy: data.createdBy || userId
    });

    await notification.populate('user', 'firstName lastName email');

    logger.info(`Notification created: ${notification._id} for user ${userId}`);

    return notification;
  }

  /**
   * Create notifications for multiple users
   * @param {string} organizationId - Organization ID
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data
   * @returns {Array} Created notifications
   */
  async createForUsers(organizationId, userIds, notificationData) {
    const notifications = userIds.map(userId => ({
      organization: organizationId,
      user: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      severity: notificationData.severity || 'info',
      resource: notificationData.resource || null,
      data: notificationData.data || {},
      actions: notificationData.actions || [],
      priority: notificationData.priority || 5,
      createdBy: notificationData.createdBy || null
    }));

    const created = await Notification.insertMany(notifications);
    logger.info(`Created ${created.length} notifications for organization ${organizationId}`);

    return created;
  }

  /**
   * Create notifications for organization admins/owners
   * @param {string} organizationId - Organization ID
   * @param {Object} notificationData - Notification data
   * @returns {Array} Created notifications
   */
  async createForOrganizationAdmins(organizationId, notificationData) {
    // Find users with admin/owner roles in the organization
    const organization = await Organization.findById(organizationId).populate('members.user');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get owner and admin members
    const adminUserIds = [organization.owner.toString()];

    // Add member users with admin/owner roles
    organization.members.forEach(member => {
      // Check if member has admin permissions
      if (member.role && (member.role.name === 'org_owner' || member.role.name === 'finance_admin')) {
        adminUserIds.push(member.user._id.toString());
      }
    });

    // Remove duplicates
    const uniqueUserIds = [...new Set(adminUserIds)];

    return this.createForUsers(organizationId, uniqueUserIds, notificationData);
  }

  // ==========================================
  // FR-49: Pricing Change Notifications
  // ==========================================

  /**
   * Notify about pricing changes
   * @param {string} organizationId - Organization ID
   * @param {Object} pricingData - Pricing change data
   * @returns {Array} Created notifications
   */
  async notifyPricingChange(organizationId, pricingData) {
    const { providerName, modelName, oldPrice, newPrice, modelId, effectiveDate } = pricingData;

    const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

    return this.createForOrganizationAdmins(organizationId, {
      type: 'pricing_change',
      title: `Pricing Update: ${modelName}`,
      message: `${providerName} ${modelName} pricing has ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}%. ${changePercent > 0 ? 'Old' : 'Previous'} price: $${oldPrice}/1M tokens. New price: $${newPrice}/1M tokens.`,
      severity: Math.abs(changePercent) > 20 ? 'critical' : Math.abs(changePercent) > 10 ? 'warning' : 'info',
      resource: modelId ? { type: 'model', id: modelId } : null,
      data: {
        providerName,
        modelName,
        oldPrice,
        newPrice,
        changePercent,
        effectiveDate: effectiveDate || new Date()
      },
      priority: Math.abs(changePercent) > 20 ? 10 : Math.abs(changePercent) > 10 ? 7 : 5,
      actions: [
        { label: 'View Model', url: `/models/${modelId}`, type: 'primary' },
        { label: 'Update Pricing', url: '/pricing-history', type: 'secondary' }
      ]
    });
  }

  /**
   * Bulk notify about pricing changes
   * @param {string} organizationId - Organization ID
   * @param {Array} pricingChanges - Array of pricing changes
   * @returns {Object} Summary of notifications created
   */
  async bulkNotifyPricingChanges(organizationId, pricingChanges) {
    const results = {
      total: pricingChanges.length,
      created: 0,
      failed: 0,
      notifications: []
    };

    for (const change of pricingChanges) {
      try {
        const notifications = await this.notifyPricingChange(organizationId, change);
        results.created += notifications.length;
        results.notifications.push(...notifications);
      } catch (error) {
        results.failed++;
        logger.error(`Failed to create pricing notification for ${change.modelName}:`, error);
      }
    }

    return results;
  }

  // ==========================================
  // FR-50: Low Margin Notifications
  // ==========================================

  /**
   * Notify about low margin
   * @param {string} organizationId - Organization ID
   * @param {Object} marginData - Margin data
   * @returns {Array} Created notifications
   */
  async notifyLowMargin(organizationId, marginData) {
    const { planName, featureName, currentMargin, thresholdMargin, planId, featureId } = marginData;

    const severity = currentMargin < 5 ? 'critical' : currentMargin < thresholdMargin ? 'warning' : 'info';
    const resourceName = featureName || planName;

    return this.createForOrganizationAdmins(organizationId, {
      type: 'low_margin',
      title: `Low Margin Alert: ${resourceName}`,
      message: `${featureName ? `Feature "${featureName}"` : `Plan "${planName}"`} is operating at ${currentMargin.toFixed(1)}% margin, which is below the threshold of ${thresholdMargin}%. Consider adjusting pricing or reviewing costs.`,
      severity,
      resource: planId ? { type: 'plan', id: planId } : featureId ? { type: 'feature', id: featureId } : null,
      data: {
        planName,
        featureName,
        currentMargin,
        thresholdMargin
      },
      priority: severity === 'critical' ? 10 : severity === 'warning' ? 8 : 6,
      actions: [
        { label: 'View Analytics', url: '/analytics', type: 'primary' },
        { label: 'Adjust Pricing', url: planId ? `/plans/${planId}` : '/plans', type: 'secondary' }
      ]
    });
  }

  /**
   * Check and notify about margins below threshold
   * @param {string} organizationId - Organization ID
   * @param {Array} marginItems - Array of items with margin data
   * @param {number} threshold - Margin threshold
   * @returns {Object} Summary of notifications created
   */
  async checkAndNotifyLowMargins(organizationId, marginItems, threshold = 15) {
    const lowMarginItems = marginItems.filter(item => item.margin < threshold);

    if (lowMarginItems.length === 0) {
      return { created: 0, notifications: [] };
    }

    const results = {
      total: lowMarginItems.length,
      created: 0,
      failed: 0,
      notifications: []
    };

    for (const item of lowMarginItems) {
      try {
        const notifications = await this.notifyLowMargin(organizationId, {
          planName: item.planName,
          featureName: item.featureName,
          currentMargin: item.margin,
          thresholdMargin: threshold,
          planId: item.planId,
          featureId: item.featureId
        });
        results.created += notifications.length;
        results.notifications.push(...notifications);
      } catch (error) {
        results.failed++;
        logger.error(`Failed to create low margin notification:`, error);
      }
    }

    return results;
  }

  // ==========================================
  // FR-51: Usage Spike Notifications
  // ==========================================

  /**
   * Notify about usage spike
   * @param {string} organizationId - Organization ID
   * @param {Object} spikeData - Usage spike data
   * @returns {Array} Created notifications
   */
  async notifyUsageSpike(organizationId, spikeData) {
    const { featureName, normalUsage, currentUsage, spikePercent, featureId } = spikeData;

    const severity = spikePercent > 200 ? 'critical' : spikePercent > 100 ? 'warning' : 'info';

    return this.createForOrganizationAdmins(organizationId, {
      type: 'usage_spike',
      title: `Usage Spike Detected: ${featureName || 'Features'}`,
      message: `Unusual usage activity detected. ${featureName ? `Feature "${featureName}"` : 'Usage'} has increased by ${spikePercent.toFixed(1)}% compared to normal levels. Normal: ${normalUsage.toLocaleString()} requests. Current: ${currentUsage.toLocaleString()} requests.`,
      severity,
      resource: featureId ? { type: 'feature', id: featureId } : null,
      data: {
        featureName,
        normalUsage,
        currentUsage,
        spikePercent,
        detectedAt: new Date()
      },
      priority: severity === 'critical' ? 10 : severity === 'warning' ? 8 : 5,
      actions: [
        { label: 'View Analytics', url: '/analytics', type: 'primary' },
        { label: 'Check Costs', url: '/pricing', type: 'secondary' }
      ]
    });
  }

  /**
   * Check for usage spikes and notify
   * @param {string} organizationId - Organization ID
   * @param {Array} usageData - Array of usage data
   * @param {number} thresholdPercent - Spike threshold percentage
   * @returns {Object} Summary of notifications created
   */
  async checkAndNotifyUsageSpikes(organizationId, usageData, thresholdPercent = 100) {
    const spikes = usageData.filter(item => {
      if (item.normalUsage === 0) return false;
      const spikePercent = ((item.currentUsage - item.normalUsage) / item.normalUsage) * 100;
      return spikePercent >= thresholdPercent;
    });

    if (spikes.length === 0) {
      return { created: 0, notifications: [] };
    }

    const results = {
      total: spikes.length,
      created: 0,
      failed: 0,
      notifications: []
    };

    for (const spike of spikes) {
      try {
        const spikePercent = ((spike.currentUsage - spike.normalUsage) / spike.normalUsage) * 100;
        const notifications = await this.notifyUsageSpike(organizationId, {
          featureName: spike.featureName,
          normalUsage: spike.normalUsage,
          currentUsage: spike.currentUsage,
          spikePercent,
          featureId: spike.featureId
        });
        results.created += notifications.length;
        results.notifications.push(...notifications);
      } catch (error) {
        results.failed++;
        logger.error(`Failed to create usage spike notification:`, error);
      }
    }

    return results;
  }

  // ==========================================
  // Retrieval Methods
  // ==========================================

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Notifications with pagination
   */
  async getForUser(userId, filters = {}) {
    const { page = 1, limit = 20, status, type, severity } = filters;

    const query = { user: userId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName email'),
      Notification.countDocuments(query)
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get notification by ID
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for ownership check)
   * @returns {Object} Notification
   */
  async getById(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    })
      .populate('user', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email');

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    return notification;
  }

  /**
   * Get unread count for a user
   * @param {string} userId - User ID
   * @returns {Object} Unread counts by type
   */
  async getUnreadCount(userId) {
    const counts = await Notification.aggregate([
      { $match: { user: mongoose.Types.ObjectId.createFromHexString(userId), status: 'unread' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const total = await Notification.countDocuments({ user: userId, status: 'unread' });

    const byType = {};
    counts.forEach(item => {
      byType[item._id] = item.count;
    });

    return {
      total,
      byType: {
        pricing_change: byType.pricing_change || 0,
        low_margin: byType.low_margin || 0,
        usage_spike: byType.usage_spike || 0,
        system: byType.system || 0,
        feature: byType.feature || 0,
        plan: byType.plan || 0,
        integration: byType.integration || 0,
        security: byType.security || 0
      }
    };
  }

  // ==========================================
  // Status Update Methods
  // ==========================================

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Updated notification
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    await notification.markAsRead();
    return notification;
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Object} Update result
   */
  async markAllAsRead(userId, filters = {}) {
    const query = { user: userId, status: 'unread' };
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;

    const result = await Notification.updateMany(
      query,
      {
        $set: {
          status: 'read',
          readAt: new Date()
        }
      }
    );

    return {
      modified: result.modifiedCount,
      matched: result.matchedCount
    };
  }

  /**
   * Dismiss notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Updated notification
   */
  async dismiss(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    await notification.dismiss();
    return notification;
  }

  /**
   * Resolve notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {string} resolvedBy - User who resolved it
   * @returns {Object} Updated notification
   */
  async resolve(notificationId, userId, resolvedBy = null) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    await notification.resolve(resolvedBy);
    return notification;
  }

  // ==========================================
  // Delete Methods
  // ==========================================

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async delete(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    logger.info(`Notification deleted: ${notificationId} by user ${userId}`);

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all read notifications for a user
   * @param {string} userId - User ID
   * @returns {Object} Delete result
   */
  async deleteAllRead(userId) {
    const result = await Notification.deleteMany({
      user: userId,
      status: { $in: ['read', 'dismissed', 'resolved'] }
    });

    return {
      deleted: result.deletedCount
    };
  }

  // ==========================================
  // Bulk Operations
  // ==========================================

  /**
   * Bulk mark as read
   * @param {Array} notificationIds - Array of notification IDs
   * @param {string} userId - User ID
   * @returns {Object} Update result
   */
  async bulkMarkAsRead(notificationIds, userId) {
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, user: userId, status: 'unread' },
      { $set: { status: 'read', readAt: new Date() } }
    );

    return {
      modified: result.modifiedCount,
      matched: result.matchedCount
    };
  }

  /**
   * Bulk delete notifications
   * @param {Array} notificationIds - Array of notification IDs
   * @param {string} userId - User ID
   * @returns {Object} Delete result
   */
  async bulkDelete(notificationIds, userId) {
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: userId
    });

    return {
      deleted: result.deletedCount
    };
  }

  // ==========================================
  // System Notifications
  // ==========================================

  /**
   * Create system notification
   * @param {string} organizationId - Organization ID
   * @param {Array} userIds - Array of user IDs
   * @param {Object} data - Notification data
   * @returns {Array} Created notifications
   */
  async createSystemNotification(organizationId, userIds, data) {
    return Notification.createSystemNotification({
      organizationId,
      userIds,
      ...data
    });
  }

  /**
   * Clean up expired notifications
   * @returns {Object} Delete result
   */
  async cleanupExpired() {
    const result = await Notification.deleteMany({
      expiresAt: { $lte: new Date() }
    });

    logger.info(`Cleaned up ${result.deletedCount} expired notifications`);

    return {
      deleted: result.deletedCount
    };
  }
}

export default new NotificationService();