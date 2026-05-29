/**
 * Activity Controller
 *
 * Handles HTTP requests for activity tracking.
 */

import activityService from '../services/activity.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class ActivityController {
  /**
   * Get user activity history
   * @route GET /api/activity/history
   */
  async getActivityHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { limit = 50, skip = 0, type, startDate, endDate } = req.query;

      const activities = await activityService.getUserActivity(userId, {
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        type,
        startDate,
        endDate
      });

      res.json({
        success: true,
        data: { activities }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent logins
   * @route GET /api/activity/recent-logins
   */
  async getRecentLogins(req, res, next) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      const logins = await activityService.getRecentLogins(userId, parseInt(limit, 10));

      res.json({
        success: true,
        data: { logins }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity statistics
   * @route GET /api/activity/statistics
   */
  async getActivityStatistics(req, res, next) {
    try {
      const userId = req.user.userId;
      const { days = 30 } = req.query;

      const statistics = await activityService.getActivityStatistics(userId, parseInt(days, 10));

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active sessions
   * @route GET /api/activity/sessions
   */
  async getActiveSessions(req, res, next) {
    try {
      const userId = req.user.userId;

      const sessions = await activityService.getActiveSessions(userId);

      res.json({
        success: true,
        data: { sessions }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session statistics
   * @route GET /api/activity/sessions/statistics
   */
  async getSessionStatistics(req, res, next) {
    try {
      const userId = req.user.userId;

      const statistics = await activityService.getSessionStatistics(userId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a specific session
   * @route DELETE /api/activity/sessions/:sessionId
   */
  async revokeSession(req, res, next) {
    try {
      const userId = req.user.userId;
      const { sessionId } = req.params;
      const ipAddress = req.ip;
      const organization = req.user.organization;

      await activityService.revokeSessionWithLogging(sessionId, userId, 'user_logout', {
        ipAddress,
        organization
      });

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke all other sessions
   * @route POST /api/activity/sessions/revoke-others
   */
  async revokeOtherSessions(req, res, next) {
    try {
      const userId = req.user.userId;
      const currentSessionId = req.headers['x-session-id']; // Assume current session ID in header
      const ipAddress = req.ip;
      const organization = req.user.organization;

      if (!currentSessionId) {
        throw new AppError('Current session ID is required', 400, 'SESSION_ID_REQUIRED');
      }

      const result = await activityService.revokeOtherSessions(userId, currentSessionId, 'security', {
        ipAddress,
        organization
      });

      res.json({
        success: true,
        message: 'Other sessions revoked successfully',
        data: { revokedCount: result.revokedCount }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization activity (admin only)
   * @route GET /api/activity/organization
   */
  async getOrganizationActivity(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { limit = 50, skip = 0, type, userId, startDate, endDate } = req.query;

      const activities = await activityService.getOrganizationActivity(organizationId, {
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        type,
        userId,
        startDate,
        endDate
      });

      res.json({
        success: true,
        data: { activities }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ActivityController();