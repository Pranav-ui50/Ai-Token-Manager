/**
 * Real-time Service
 *
 * Handles real-time token monitoring, usage updates, and live notifications.
 * Integrates with Socket.IO for WebSocket communication.
 */

import { getSocketIO, isSocketInitialized } from '../config/socket.js';
import Feature from '../models/Feature.js';
import Project from '../models/Project.js';
import Organization from '../models/Organization.js';
import logger from '../config/logger.js';

class RealtimeService {
  constructor() {
    this.usageIntervals = new Map();
    this.monitoringActive = false;
  }

  /**
   * Initialize real-time monitoring
   */
  initialize() {
    if (this.monitoringActive) return;

    this.monitoringActive = true;
    logger.info('Real-time monitoring service initialized');
  }

  /**
   * Shutdown real-time monitoring
   */
  shutdown() {
    // Clear all monitoring intervals
    for (const [key, interval] of this.usageIntervals) {
      clearInterval(interval);
    }
    this.usageIntervals.clear();
    this.monitoringActive = false;
    logger.info('Real-time monitoring service shutdown');
  }

  // ==========================================
  // Token Usage Emissions
  // ==========================================

  /**
   * Emit token usage update to organization
   * @param {string} organizationId - Organization ID
   * @param {Object} usageData - Usage data
   */
  emitTokenUsageUpdate(organizationId, usageData) {
    if (!isSocketInitialized()) {
      logger.debug('Socket.IO not initialized, skipping token usage emission');
      return;
    }

    const io = getSocketIO();
    io.to(`tokens:org:${organizationId}`).emit('token-usage:update', {
      organizationId,
      ...usageData,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Token usage update emitted for organization ${organizationId}`);
  }

  /**
   * Emit feature token usage update
   * @param {string} featureId - Feature ID
   * @param {Object} usageData - Usage data
   */
  emitFeatureTokenUsage(featureId, usageData) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`tokens:feature:${featureId}`).emit('token-usage:feature', {
      featureId,
      ...usageData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit project token usage update
   * @param {string} projectId - Project ID
   * @param {Object} usageData - Usage data
   */
  emitProjectTokenUsage(projectId, usageData) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`tokens:project:${projectId}`).emit('token-usage:project', {
      projectId,
      ...usageData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit real-time token consumption event
   * @param {string} organizationId - Organization ID
   * @param {Object} consumptionData - Consumption data
   */
  emitTokenConsumption(organizationId, consumptionData) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`tokens:org:${organizationId}`).emit('token-usage:consumption', {
      organizationId,
      ...consumptionData,
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // Feature Updates
  // ==========================================

  /**
   * Emit feature update
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID
   * @param {string} action - Action performed (created, updated, deleted)
   * @param {Object} data - Feature data
   */
  emitFeatureUpdate(organizationId, featureId, action, data) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();

    // Emit to organization
    io.to(`features:org:${organizationId}`).emit('feature:update', {
      action,
      featureId,
      data,
      timestamp: new Date().toISOString()
    });

    // Emit to specific feature room
    io.to(`feature:${featureId}`).emit('feature:detail', {
      action,
      featureId,
      data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Feature ${featureId} ${action} event emitted for organization ${organizationId}`);
  }

  // ==========================================
  // Project Updates
  // ==========================================

  /**
   * Emit project update
   * @param {string} organizationId - Organization ID
   * @param {string} projectId - Project ID
   * @param {string} action - Action performed
   * @param {Object} data - Project data
   */
  emitProjectUpdate(organizationId, projectId, action, data) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();

    io.to(`org:${organizationId}`).emit('project:update', {
      action,
      projectId,
      data,
      timestamp: new Date().toISOString()
    });

    io.to(`project:${projectId}`).emit('project:detail', {
      action,
      projectId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // Analytics Updates
  // ==========================================

  /**
   * Emit analytics update
   * @param {string} organizationId - Organization ID
   * @param {Object} analyticsData - Analytics data
   */
  emitAnalyticsUpdate(organizationId, analyticsData) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`analytics:org:${organizationId}`).emit('analytics:update', {
      organizationId,
      ...analyticsData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit dashboard metrics update
   * @param {string} organizationId - Organization ID
   * @param {Object} metrics - Dashboard metrics
   */
  emitDashboardMetrics(organizationId, metrics) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('dashboard:metrics', {
      organizationId,
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // Notifications
  // ==========================================

  /**
   * Emit notification to user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   */
  emitUserNotification(userId, notification) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`user:${userId}`).emit('notification:new', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit notification to organization
   * @param {string} organizationId - Organization ID
   * @param {Object} notification - Notification data
   */
  emitOrganizationNotification(organizationId, notification) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('notification:org', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // Alerts
  // ==========================================

  /**
   * Emit usage alert
   * @param {string} organizationId - Organization ID
   * @param {Object} alert - Alert data
   */
  emitUsageAlert(organizationId, alert) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`tokens:org:${organizationId}`).emit('alert:usage', {
      organizationId,
      ...alert,
      timestamp: new Date().toISOString()
    });

    logger.info(`Usage alert emitted for organization ${organizationId}: ${alert.type}`);
  }

  /**
   * Emit pricing change alert
   * @param {string} organizationId - Organization ID
   * @param {Object} alert - Pricing alert data
   */
  emitPricingAlert(organizationId, alert) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('alert:pricing', {
      organizationId,
      ...alert,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit low margin alert
   * @param {string} organizationId - Organization ID
   * @param {Object} alert - Margin alert data
   */
  emitMarginAlert(organizationId, alert) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('alert:margin', {
      organizationId,
      ...alert,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit usage spike alert
   * @param {string} organizationId - Organization ID
   * @param {Object} alert - Spike alert data
   */
  emitSpikeAlert(organizationId, alert) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('alert:spike', {
      organizationId,
      ...alert,
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // Live Usage Statistics
  // ==========================================

  /**
   * Start live usage monitoring for organization
   * @param {string} organizationId - Organization ID
   * @param {number} intervalMs - Interval in milliseconds
   */
  async startUsageMonitoring(organizationId, intervalMs = 30000) {
    const key = `monitor:${organizationId}`;

    if (this.usageIntervals.has(key)) {
      logger.debug(`Usage monitoring already active for organization ${organizationId}`);
      return;
    }

    const interval = setInterval(async () => {
      try {
        await this.collectAndEmitUsageStats(organizationId);
      } catch (error) {
        logger.error(`Error collecting usage stats for ${organizationId}: ${error.message}`);
      }
    }, intervalMs);

    this.usageIntervals.set(key, interval);
    logger.info(`Usage monitoring started for organization ${organizationId}`);
  }

  /**
   * Stop live usage monitoring for organization
   * @param {string} organizationId - Organization ID
   */
  stopUsageMonitoring(organizationId) {
    const key = `monitor:${organizationId}`;

    if (this.usageIntervals.has(key)) {
      clearInterval(this.usageIntervals.get(key));
      this.usageIntervals.delete(key);
      logger.info(`Usage monitoring stopped for organization ${organizationId}`);
    }
  }

  /**
   * Collect and emit usage statistics
   * @param {string} organizationId - Organization ID
   */
  async collectAndEmitUsageStats(organizationId) {
    try {
      // Get organization usage limits
      const organization = await Organization.findById(organizationId).lean();
      if (!organization) return;

      // Aggregate feature usage
      const featureStats = await Feature.aggregate([
        {
          $match: {
            organization: organization._id,
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: '$stats.totalRequests' },
            totalTokens: { $sum: '$stats.totalTokens' },
            totalCost: { $sum: '$stats.totalCost' },
            features: { $push: '$name' }
          }
        }
      ]);

      const stats = featureStats[0] || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        features: []
      };

      // Get project count
      const projectCount = await Project.countDocuments({
        organization: organization._id,
        isActive: true
      });

      // Get active feature count
      const featureCount = await Feature.countDocuments({
        organization: organization._id,
        isActive: true
      });

      // Emit usage update
      this.emitTokenUsageUpdate(organizationId, {
        totalRequests: stats.totalRequests,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost,
        projectCount,
        featureCount,
        plan: organization.subscription?.plan || 'free',
        status: organization.subscription?.status || 'trial'
      });

      // Check for alerts
      await this.checkAndEmitAlerts(organizationId, stats, organization);

    } catch (error) {
      logger.error(`Error in collectAndEmitUsageStats: ${error.message}`);
    }
  }

  /**
   * Check for alerts and emit them
   * @param {string} organizationId - Organization ID
   * @param {Object} stats - Current stats
   * @param {Object} organization - Organization data
   */
  async checkAndEmitAlerts(organizationId, stats, organization) {
    // Define plan limits
    const planLimits = {
      free: { apiCalls: 1000, tokens: 10000 },
      starter: { apiCalls: 10000, tokens: 100000 },
      professional: { apiCalls: 100000, tokens: 1000000 },
      enterprise: { apiCalls: Infinity, tokens: Infinity }
    };

    const plan = organization.subscription?.plan || 'free';
    const limits = planLimits[plan] || planLimits.free;

    // Check API call usage
    const apiCallPercentage = (stats.totalRequests / limits.apiCalls) * 100;
    if (apiCallPercentage >= 80) {
      this.emitUsageAlert(organizationId, {
        type: 'api_calls_threshold',
        severity: apiCallPercentage >= 100 ? 'critical' : 'warning',
        percentage: Math.round(apiCallPercentage),
        current: stats.totalRequests,
        limit: limits.apiCalls,
        message: apiCallPercentage >= 100
          ? 'API call limit reached'
          : `API calls at ${Math.round(apiCallPercentage)}% of limit`
      });
    }

    // Check token usage
    const tokenPercentage = (stats.totalTokens / limits.tokens) * 100;
    if (tokenPercentage >= 80) {
      this.emitUsageAlert(organizationId, {
        type: 'token_threshold',
        severity: tokenPercentage >= 100 ? 'critical' : 'warning',
        percentage: Math.round(tokenPercentage),
        current: stats.totalTokens,
        limit: limits.tokens,
        message: tokenPercentage >= 100
          ? 'Token limit reached'
          : `Tokens at ${Math.round(tokenPercentage)}% of limit`
      });
    }

    // Check cost threshold (e.g., $1000)
    const costThreshold = 1000;
    if (stats.totalCost >= costThreshold * 0.8) {
      this.emitUsageAlert(organizationId, {
        type: 'cost_threshold',
        severity: stats.totalCost >= costThreshold ? 'critical' : 'warning',
        current: stats.totalCost,
        threshold: costThreshold,
        message: stats.totalCost >= costThreshold
          ? `Cost threshold exceeded: $${stats.totalCost.toFixed(2)}`
          : `Cost approaching threshold: $${stats.totalCost.toFixed(2)}`
      });
    }
  }

  // ==========================================
  // Integration Updates
  // ==========================================

  /**
   * Emit integration status update
   * @param {string} organizationId - Organization ID
   * @param {string} integrationId - Integration ID
   * @param {Object} status - Status data
   */
  emitIntegrationStatus(organizationId, integrationId, status) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('integration:status', {
      organizationId,
      integrationId,
      ...status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit sync status update
   * @param {string} organizationId - Organization ID
   * @param {string} syncId - Sync ID
   * @param {Object} status - Sync status
   */
  emitSyncStatus(organizationId, syncId, status) {
    if (!isSocketInitialized()) return;

    const io = getSocketIO();
    io.to(`org:${organizationId}`).emit('sync:status', {
      organizationId,
      syncId,
      ...status,
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // Connection Statistics
  // ==========================================

  /**
   * Get connected clients count for organization
   * @param {string} organizationId - Organization ID
   * @returns {number} Number of connected clients
   */
  getOrganizationClientsCount(organizationId) {
    if (!isSocketInitialized()) return 0;

    const io = getSocketIO();
    const room = io.sockets.adapter.rooms.get(`org:${organizationId}`);
    return room ? room.size : 0;
  }

  /**
   * Get total connected clients count
   * @returns {number} Total number of connected clients
   */
  getTotalClientsCount() {
    if (!isSocketInitialized()) return 0;

    const io = getSocketIO();
    return io.sockets.sockets.size;
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    if (!isSocketInitialized()) {
      return {
        totalClients: 0,
        rooms: [],
        monitoringActive: this.monitoringActive
      };
    }

    const io = getSocketIO();
    const rooms = Array.from(io.sockets.adapter.rooms.keys());

    return {
      totalClients: io.sockets.sockets.size,
      rooms: rooms.filter(r => !r.startsWith('socket:')),
      monitoringActive: this.monitoringActive,
      activeMonitors: this.usageIntervals.size
    };
  }
}

export default new RealtimeService();