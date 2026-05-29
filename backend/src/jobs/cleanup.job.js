/**
 * Cleanup Job Processor
 *
 * Processes maintenance and cleanup tasks.
 */

import logger from '../config/logger.js';
import sessionService from '../services/session.service.js';
import cacheService from '../services/cache.service.js';
import rateLimiterService from '../services/rateLimiter.service.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import Report from '../models/Report.js';
import Simulation from '../models/Simulation.js';
import PasswordReset from '../models/PasswordReset.js';
import EmailVerification from '../models/EmailVerification.js';
import Invitation from '../models/Invitation.js';

/**
 * Cleanup job types
 */
const CLEANUP_TYPES = {
  EXPIRED_SESSIONS: 'expired_sessions',
  EXPIRED_TOKENS: 'expired_tokens',
  OLD_AUDIT_LOGS: 'old_audit_logs',
  OLD_NOTIFICATIONS: 'old_notifications',
  OLD_REPORTS: 'old_reports',
  OLD_SIMULATIONS: 'old_simulations',
  MEMORY_CACHE: 'memory_cache',
  RATE_LIMITS: 'rate_limits',
  ALL: 'all'
};

// Retention periods (in days)
const RETENTION_PERIODS = {
  auditLogs: 90,
  notifications: 30,
  reports: 365,
  simulations: 180,
  passwordResets: 1,
  emailVerifications: 7,
  invitations: 30
};

/**
 * Process cleanup job
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>}
 */
async function processCleanupJob(data, job) {
  const {
    type,
    parameters = {},
    options = {}
  } = data;

  logger.info(`Processing cleanup job: ${type}`);

  try {
    // Update job progress
    if (job) {
      job.progress(10);
    }

    let result;

    switch (type) {
      case CLEANUP_TYPES.EXPIRED_SESSIONS:
        result = await cleanupExpiredSessions(parameters);
        break;

      case CLEANUP_TYPES.EXPIRED_TOKENS:
        result = await cleanupExpiredTokens(parameters);
        break;

      case CLEANUP_TYPES.OLD_AUDIT_LOGS:
        result = await cleanupOldAuditLogs(parameters);
        break;

      case CLEANUP_TYPES.OLD_NOTIFICATIONS:
        result = await cleanupOldNotifications(parameters);
        break;

      case CLEANUP_TYPES.OLD_REPORTS:
        result = await cleanupOldReports(parameters);
        break;

      case CLEANUP_TYPES.OLD_SIMULATIONS:
        result = await cleanupOldSimulations(parameters);
        break;

      case CLEANUP_TYPES.MEMORY_CACHE:
        result = await cleanupMemoryCache(parameters);
        break;

      case CLEANUP_TYPES.RATE_LIMITS:
        result = await cleanupRateLimits(parameters);
        break;

      case CLEANUP_TYPES.ALL:
        result = await runAllCleanups(parameters);
        break;

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }

    logger.info(`Cleanup job completed: ${type}`, result);

    return {
      success: true,
      type,
      ...result,
      cleanedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Cleanup job failed: ${type}`, error.message);
    throw error;
  }
}

/**
 * Cleanup expired sessions
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupExpiredSessions(parameters) {
  const cleaned = await sessionService.cleanupExpiredSessions();

  return {
    sessionsCleaned: cleaned
  };
}

/**
 * Cleanup expired tokens (password resets, email verifications)
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupExpiredTokens(parameters) {
  const now = new Date();

  // Clean expired password resets
  const passwordResets = await PasswordReset.deleteMany({
    expiresAt: { $lt: now }
  });

  // Clean expired email verifications
  const emailVerifications = await EmailVerification.deleteMany({
    expiresAt: { $lt: now }
  });

  // Clean expired invitations
  const invitations = await Invitation.deleteMany({
    expiresAt: { $lt: now },
    status: 'pending'
  });

  return {
    passwordResetsDeleted: passwordResets.deletedCount,
    emailVerificationsDeleted: emailVerifications.deletedCount,
    invitationsDeleted: invitations.deletedCount
  };
}

/**
 * Cleanup old audit logs
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupOldAuditLogs(parameters) {
  const { retentionDays = RETENTION_PERIODS.auditLogs } = parameters;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate }
  });

  return {
    auditLogsDeleted: result.deletedCount,
    retentionDays
  };
}

/**
 * Cleanup old notifications
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupOldNotifications(parameters) {
  const { retentionDays = RETENTION_PERIODS.notifications } = parameters;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Delete old read notifications
  const result = await Notification.deleteMany({
    isRead: true,
    createdAt: { $lt: cutoffDate }
  });

  return {
    notificationsDeleted: result.deletedCount,
    retentionDays
  };
}

/**
 * Cleanup old reports
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupOldReports(parameters) {
  const { retentionDays = RETENTION_PERIODS.reports, keepGenerated = true } = parameters;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const query = {
    createdAt: { $lt: cutoffDate }
  };

  // Optionally keep generated reports (only delete temporary ones)
  if (keepGenerated) {
    query.status = { $ne: 'completed' };
  }

  const result = await Report.deleteMany(query);

  return {
    reportsDeleted: result.deletedCount,
    retentionDays
  };
}

/**
 * Cleanup old simulations
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupOldSimulations(parameters) {
  const { retentionDays = RETENTION_PERIODS.simulations, keepSaved = true } = parameters;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const query = {
    createdAt: { $lt: cutoffDate }
  };

  // Optionally keep saved simulations
  if (keepSaved) {
    query.isSaved = false;
  }

  const result = await Simulation.deleteMany(query);

  return {
    simulationsDeleted: result.deletedCount,
    retentionDays
  };
}

/**
 * Cleanup memory cache
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupMemoryCache(parameters) {
  // Clear memory cache
  await cacheService.clear();

  return {
    cacheCleared: true
  };
}

/**
 * Cleanup rate limits
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function cleanupRateLimits(parameters) {
  // Cleanup is handled by the rate limiter service
  rateLimiterService.cleanupMemoryStore();

  return {
    rateLimitsCleaned: true
  };
}

/**
 * Run all cleanup tasks
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function runAllCleanups(parameters) {
  const results = {
    sessions: {},
    tokens: {},
    auditLogs: {},
    notifications: {},
    reports: {},
    simulations: {},
    memoryCache: {},
    rateLimits: {}
  };

  try {
    results.sessions = await cleanupExpiredSessions(parameters);
  } catch (e) {
    results.sessions.error = e.message;
  }

  try {
    results.tokens = await cleanupExpiredTokens(parameters);
  } catch (e) {
    results.tokens.error = e.message;
  }

  try {
    results.auditLogs = await cleanupOldAuditLogs(parameters);
  } catch (e) {
    results.auditLogs.error = e.message;
  }

  try {
    results.notifications = await cleanupOldNotifications(parameters);
  } catch (e) {
    results.notifications.error = e.message;
  }

  try {
    results.reports = await cleanupOldReports(parameters);
  } catch (e) {
    results.reports.error = e.message;
  }

  try {
    results.simulations = await cleanupOldSimulations(parameters);
  } catch (e) {
    results.simulations.error = e.message;
  }

  try {
    results.memoryCache = await cleanupMemoryCache(parameters);
  } catch (e) {
    results.memoryCache.error = e.message;
  }

  try {
    results.rateLimits = await cleanupRateLimits(parameters);
  } catch (e) {
    results.rateLimits.error = e.message;
  }

  return results;
}

/**
 * Schedule recurring cleanup jobs
 * @param {Object} queueService - Queue service instance
 */
async function scheduleRecurringCleanups(queueService) {
  // Daily cleanup at 2 AM
  await queueService.scheduleRecurring('cleanup', 'daily-cleanup', { type: 'all' }, '0 2 * * *');

  // Hourly session cleanup
  await queueService.scheduleRecurring('cleanup', 'hourly-sessions', { type: 'expired_sessions' }, '0 * * * *');

  logger.info('Recurring cleanup jobs scheduled');
}

/**
 * Register cleanup processor with queue service
 * @param {Object} queueService - Queue service instance
 */
async function register(queueService) {
  await queueService.registerProcessor('cleanup', processCleanupJob, 1);
  logger.info('Cleanup job processor registered');
}

export default {
  process: processCleanupJob,
  register,
  scheduleRecurringCleanups,
  CLEANUP_TYPES,
  RETENTION_PERIODS
};