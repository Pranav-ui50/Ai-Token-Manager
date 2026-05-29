/**
 * Activity Tracking Service
 *
 * Handles user activity logging and session tracking.
 */

import ActivityLog from '../models/ActivityLog.js';
import Session from '../models/Session.js';
import logger from '../config/logger.js';

class ActivityService {
  /**
   * Log user activity
   * @param {Object} data - Activity data
   * @returns {Object} Created activity log
   */
  async logActivity(data) {
    try {
      const activity = await ActivityLog.log(data);
      logger.debug(`[Activity] Logged ${data.type} for user ${data.user}`);
      return activity;
    } catch (error) {
      logger.error('[Activity] Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Log login activity
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} context - Request context
   */
  async logLogin(userId, sessionId, context = {}) {
    const { ipAddress, userAgent, device, browser, location, organization } = context;

    return this.logActivity({
      user: userId,
      organization,
      type: 'login',
      description: 'User logged in successfully',
      ipAddress,
      userAgent,
      device: {
        type: device?.type || 'unknown',
        name: device?.name,
        os: device?.os,
        browser: browser?.name
      },
      location: {
        city: location?.city,
        region: location?.region,
        country: location?.country,
        countryCode: location?.countryCode,
        coordinates: location?.coordinates
      },
      sessionId,
      status: 'success'
    });
  }

  /**
   * Log failed login attempt
   * @param {string} userId - User ID (if known)
   * @param {string} email - Email used
   * @param {Object} context - Request context
   */
  async logFailedLogin(userId, email, context = {}) {
    const { ipAddress, userAgent, device, browser, location } = context;

    return this.logActivity({
      user: userId,
      type: 'failed_login',
      description: `Failed login attempt for ${email}`,
      ipAddress,
      userAgent,
      device: {
        type: device?.type || 'unknown',
        name: device?.name,
        os: device?.os,
        browser: browser?.name
      },
      location: {
        city: location?.city,
        region: location?.region,
        country: location?.country,
        countryCode: location?.countryCode
      },
      status: 'failed'
    });
  }

  /**
   * Log logout activity
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} context - Request context
   */
  async logLogout(userId, sessionId, context = {}) {
    const { ipAddress, organization } = context;

    return this.logActivity({
      user: userId,
      organization,
      type: 'logout',
      description: 'User logged out',
      ipAddress,
      sessionId,
      status: 'success'
    });
  }

  /**
   * Log password change
   * @param {string} userId - User ID
   * @param {Object} context - Request context
   */
  async logPasswordChange(userId, context = {}) {
    const { ipAddress, userAgent, organization } = context;

    return this.logActivity({
      user: userId,
      organization,
      type: 'password_change',
      description: 'Password changed successfully',
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  /**
   * Log 2FA enabled
   * @param {string} userId - User ID
   * @param {Object} context - Request context
   */
  async log2FAEnabled(userId, context = {}) {
    const { ipAddress, organization } = context;

    return this.logActivity({
      user: userId,
      organization,
      type: '2fa_enabled',
      description: 'Two-factor authentication enabled',
      ipAddress,
      status: 'success'
    });
  }

  /**
   * Log 2FA disabled
   * @param {string} userId - User ID
   * @param {Object} context - Request context
   */
  async log2FADisabled(userId, context = {}) {
    const { ipAddress, organization } = context;

    return this.logActivity({
      user: userId,
      organization,
      type: '2fa_disabled',
      description: 'Two-factor authentication disabled',
      ipAddress,
      status: 'success'
    });
  }

  /**
   * Log session revoked
   * @param {string} userId - User ID
   * @param {string} revokedSessionId - Revoked session ID
   * @param {Object} context - Request context
   */
  async logSessionRevoked(userId, revokedSessionId, context = {}) {
    const { ipAddress, organization } = context;

    return this.logActivity({
      user: userId,
      organization,
      type: 'session_revoked',
      description: 'Session revoked',
      ipAddress,
      sessionId: revokedSessionId,
      status: 'success'
    });
  }

  /**
   * Get user activity history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Activity logs
   */
  async getUserActivity(userId, options = {}) {
    return ActivityLog.getUserActivities(userId, options);
  }

  /**
   * Get organization activity history
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Array} Activity logs
   */
  async getOrganizationActivity(organizationId, options = {}) {
    return ActivityLog.getOrganizationActivities(organizationId, options);
  }

  /**
   * Get recent logins
   * @param {string} userId - User ID
   * @param {number} limit - Number of results
   * @returns {Array} Recent login activities
   */
  async getRecentLogins(userId, limit = 10) {
    return ActivityLog.getRecentLogins(userId, limit);
  }

  /**
   * Get activity statistics
   * @param {string} userId - User ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Statistics
   */
  async getActivityStatistics(userId, days = 30) {
    return ActivityLog.getStatistics(userId, days);
  }

  // ==========================================
  // Session Management
  // ==========================================

  /**
   * Get active sessions for user
   * @param {string} userId - User ID
   * @returns {Array} Active sessions
   */
  async getActiveSessions(userId) {
    const sessions = await Session.getActiveSessions(userId);

    // Get activity data for each session
    const sessionsWithActivity = await Promise.all(
      sessions.map(async (session) => {
        const loginActivity = await ActivityLog.findOne({
          user: userId,
          type: 'login',
          sessionId: session.sessionId,
          status: 'success'
        }).sort({ createdAt: -1 });

        return {
          ...session.toObject(),
          loginActivity: loginActivity || null
        };
      })
    );

    return sessionsWithActivity;
  }

  /**
   * Create session with activity logging
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @param {Object} context - Request context
   * @returns {Object} Created session
   */
  async createSessionWithLogging(userId, refreshToken, context = {}) {
    const { ipAddress, userAgent, device, browser, location, organization, expiresAt } = context;

    // Create session
    const session = await Session.createSession(userId, refreshToken, {
      device,
      browser,
      location,
      expiresAt
    });

    // Log login activity
    await this.logLogin(userId, session.sessionId, {
      ipAddress,
      userAgent,
      device,
      browser,
      location,
      organization
    });

    return session;
  }

  /**
   * Revoke session with activity logging
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {string} reason - Revocation reason
   * @param {Object} context - Request context
   * @returns {Object} Result
   */
  async revokeSessionWithLogging(sessionId, userId, reason = 'user_logout', context = {}) {
    // Revoke session
    const result = await Session.revokeSession(sessionId, reason);

    // Log session revocation
    await this.logSessionRevoked(userId, sessionId, context);

    return result;
  }

  /**
   * Revoke all other sessions
   * @param {string} userId - User ID
   * @param {string} currentSessionId - Current session ID to keep
   * @param {string} reason - Revocation reason
   * @param {Object} context - Request context
   * @returns {Object} Result
   */
  async revokeOtherSessions(userId, currentSessionId, reason = 'security', context = {}) {
    const result = await Session.revokeAllSessions(userId, reason, currentSessionId);

    // Log activity
    await this.logActivity({
      user: userId,
      organization: context.organization,
      type: 'session_revoked',
      description: `Revoked ${result.modifiedCount} other sessions`,
      ipAddress: context.ipAddress,
      metadata: { revokedCount: result.modifiedCount, reason },
      status: 'success'
    });

    return result;
  }

  /**
   * Get session statistics
   * @param {string} userId - User ID
   * @returns {Object} Session statistics
   */
  async getSessionStatistics(userId) {
    return Session.getSessionStats(userId);
  }

  /**
   * Cleanup old activity logs
   * @param {number} daysToKeep - Days to keep
   * @returns {number} Deleted count
   */
  async cleanupOldLogs(daysToKeep = 90) {
    const count = await ActivityLog.cleanup(daysToKeep);
    logger.info(`[Activity] Cleaned up ${count} old activity logs`);
    return count;
  }
}

export default new ActivityService();