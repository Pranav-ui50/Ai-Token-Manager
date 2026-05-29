/**
 * Real-time Middleware
 *
 * Middleware for emitting real-time events from other services.
 * Can be used to automatically emit events on certain actions.
 */

import realtimeService from '../services/realtime.service.js';
import { isSocketInitialized } from '../config/socket.js';

/**
 * Middleware to emit feature events after controller actions
 * @param {string} action - Action type (created, updated, deleted)
 */
export const emitFeatureEvent = (action) => {
  return async (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;

    // Override end function
    res.end = function (...args) {
      // Only emit on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.organization) {
        try {
          const featureId = req.params.id || req.body?._id || res.locals.featureId;

          if (featureId) {
            realtimeService.emitFeatureUpdate(
              req.user.organization,
              featureId,
              action,
              res.locals.featureData || {}
            );
          }
        } catch (error) {
          // Don't fail the request if real-time emission fails
          console.error('Failed to emit feature event:', error.message);
        }
      }

      // Call original end function
      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Middleware to emit project events after controller actions
 * @param {string} action - Action type (created, updated, deleted)
 */
export const emitProjectEvent = (action) => {
  return async (req, res, next) => {
    const originalEnd = res.end;

    res.end = function (...args) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.organization) {
        try {
          const projectId = req.params.id || req.body?._id || res.locals.projectId;

          if (projectId) {
            realtimeService.emitProjectUpdate(
              req.user.organization,
              projectId,
              action,
              res.locals.projectData || {}
            );
          }
        } catch (error) {
          console.error('Failed to emit project event:', error.message);
        }
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Middleware to emit usage events after API calls
 */
export const emitUsageEvent = () => {
  return async (req, res, next) => {
    const originalEnd = res.end;

    res.end = function (...args) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.organization) {
        try {
          // Emit usage consumption event if usage data is available
          if (res.locals.usageData) {
            realtimeService.emitTokenConsumption(
              req.user.organization,
              res.locals.usageData
            );
          }
        } catch (error) {
          console.error('Failed to emit usage event:', error.message);
        }
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Middleware to emit integration events
 * @param {string} eventType - Event type
 */
export const emitIntegrationEvent = (eventType) => {
  return async (req, res, next) => {
    const originalEnd = res.end;

    res.end = function (...args) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.organization) {
        try {
          const integrationId = req.params.id || res.locals.integrationId;

          if (integrationId) {
            realtimeService.emitIntegrationStatus(
              req.user.organization,
              integrationId,
              {
                type: eventType,
                status: res.locals.integrationStatus || 'completed',
                data: res.locals.integrationData || {}
              }
            );
          }
        } catch (error) {
          console.error('Failed to emit integration event:', error.message);
        }
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Middleware to emit sync events
 * @param {string} status - Sync status
 */
export const emitSyncEvent = (status) => {
  return async (req, res, next) => {
    const originalEnd = res.end;

    res.end = function (...args) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.organization) {
        try {
          const syncId = res.locals.syncId;

          if (syncId) {
            realtimeService.emitSyncStatus(
              req.user.organization,
              syncId,
              {
                status,
                progress: res.locals.syncProgress,
                data: res.locals.syncData || {}
              }
            );
          }
        } catch (error) {
          console.error('Failed to emit sync event:', error.message);
        }
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Middleware to emit notification events
 * @param {string} type - Notification type
 * @param {Function} getNotificationData - Function to extract notification data
 */
export const emitNotificationEvent = (type, getNotificationData) => {
  return async (req, res, next) => {
    const originalEnd = res.end;

    res.end = async function (...args) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const notificationData = await getNotificationData(req, res);

          if (notificationData?.userId) {
            realtimeService.emitUserNotification(notificationData.userId, {
              type,
              ...notificationData
            });
          } else if (notificationData?.organizationId || req.user?.organization) {
            realtimeService.emitOrganizationNotification(
              notificationData.organizationId || req.user.organization,
              {
                type,
                ...notificationData
              }
            );
          }
        } catch (error) {
          console.error('Failed to emit notification event:', error.message);
        }
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Check if WebSocket is available
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const checkWebSocketAvailable = (req, res, next) => {
  req.websocketAvailable = isSocketInitialized();

  if (!req.websocketAvailable) {
    res.set('X-WebSocket-Available', 'false');
  } else {
    res.set('X-WebSocket-Available', 'true');
  }

  next();
};

/**
 * Get WebSocket connection info
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const getWebSocketInfo = (req, res, next) => {
  if (!isSocketInitialized()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'WEBSOCKET_UNAVAILABLE',
        message: 'WebSocket server is not available'
      }
    });
  }

  const info = {
    connected: true,
    endpoint: '/socket.io',
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000
  };

  res.status(200).json({
    success: true,
    data: info
  });
};

export default {
  emitFeatureEvent,
  emitProjectEvent,
  emitUsageEvent,
  emitIntegrationEvent,
  emitSyncEvent,
  emitNotificationEvent,
  checkWebSocketAvailable,
  getWebSocketInfo
};