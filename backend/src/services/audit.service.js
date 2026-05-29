import AuditLog, { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } from '../models/AuditLog.js';
import mongoose from 'mongoose';

class AuditService {
  /**
   * Log an action
   */
  async log(logData) {
    try {
      console.log('[Audit] Creating log:', {
        action: logData.action,
        resourceType: logData.resourceType,
        organization: logData.organization,
        user: logData.user
      });
      const log = await AuditLog.log(logData);
      console.log('[Audit] Log created successfully:', log._id);
      return log;
    } catch (error) {
      console.error('[Audit] Failed to create audit log:', error);
      // Don't throw error - audit logging should not break the main flow
      return null;
    }
  }

  /**
   * Log with automatic diff calculation
   */
  async logWithDiff({
    organization,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    beforeState,
    afterState,
    context,
    metadata,
    severity = 'info'
  }) {
    try {
      const log = await AuditLog.logWithDiff({
        organization,
        user,
        action,
        resourceType,
        resourceId,
        resourceName,
        beforeState,
        afterState,
        context,
        metadata,
        severity
      });
      return log;
    } catch (error) {
      console.error('Failed to create audit log with diff:', error);
      return null;
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess({
    organization,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    description,
    beforeState,
    afterState,
    context,
    metadata,
    duration
  }) {
    return this.log({
      organization,
      user,
      action,
      resourceType,
      resourceId,
      resourceName,
      description,
      beforeState,
      afterState,
      context,
      metadata,
      severity: 'info',
      status: 'success',
      duration
    });
  }

  /**
   * Log a failed action
   */
  async logFailure({
    organization,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    description,
    error,
    context,
    metadata
  }) {
    return this.log({
      organization,
      user,
      action,
      resourceType,
      resourceId,
      resourceName,
      description,
      context,
      metadata,
      severity: 'error',
      status: 'failure',
      error: {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      }
    });
  }

  /**
   * Log a critical event
   */
  async logCritical({
    organization,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    description,
    context,
    metadata
  }) {
    return this.log({
      organization,
      user,
      action,
      resourceType,
      resourceId,
      resourceName,
      description,
      context,
      metadata,
      severity: 'critical',
      status: 'success'
    });
  }

  /**
   * Log a warning
   */
  async logWarning({
    organization,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    description,
    context,
    metadata
  }) {
    return this.log({
      organization,
      user,
      action,
      resourceType,
      resourceId,
      resourceName,
      description,
      context,
      metadata,
      severity: 'warning',
      status: 'success'
    });
  }

  /**
   * Get logs for an organization
   */
  async getLogs(organizationId, options = {}) {
    const {
      action,
      resourceType,
      resourceId,
      userId,
      severity,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sort = '-createdAt'
    } = options;

    const logs = await AuditLog.findByOrganization(organizationId, {
      action,
      resourceType,
      resourceId,
      userId,
      severity,
      status,
      startDate,
      endDate,
      search,
      page,
      limit,
      sort
    });

    const total = await AuditLog.countDocuments({
      organization: organizationId,
      ...(action && { action }),
      ...(resourceType && { resourceType }),
      ...(resourceId && { resourceId }),
      ...(userId && { user: userId }),
      ...(severity && { severity }),
      ...(status && { status }),
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      },
      ...(search && {
        $or: [
          { description: { $regex: search, $options: 'i' } },
          { resourceName: { $regex: search, $options: 'i' } }
        ]
      })
    });

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userId, options = {}) {
    const { page = 1, limit = 50, sort = '-createdAt' } = options;

    const logs = await AuditLog.findByUser(userId, { page, limit, sort });
    const total = await AuditLog.countDocuments({ user: userId });

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get logs for a specific resource
   */
  async getResourceLogs(resourceType, resourceId, options = {}) {
    const { page = 1, limit = 50, sort = '-createdAt' } = options;

    const logs = await AuditLog.findByResource(resourceType, resourceId, { page, limit, sort });
    const total = await AuditLog.countDocuments({ resourceType, resourceId });

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(organizationId, limit = 10) {
    return AuditLog.getRecentActivity(organizationId, limit);
  }

  /**
   * Get statistics
   */
  async getStatistics(organizationId, startDate, endDate) {
    return AuditLog.getStatistics(organizationId, startDate, endDate);
  }

  /**
   * Get action summary by type
   */
  async getActionSummary(organizationId, startDate, endDate) {
    const match = {
      organization: mongoose.Types.ObjectId(organizationId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const summary = await AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return summary;
  }

  /**
   * Get resource summary
   */
  async getResourceSummary(organizationId, startDate, endDate) {
    const match = {
      organization: mongoose.Types.ObjectId(organizationId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const summary = await AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$resourceType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return summary;
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(organizationId, startDate, endDate) {
    const match = {
      organization: mongoose.Types.ObjectId(organizationId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const summary = await AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$user',
          actionCount: { $sum: 1 },
          actions: { $push: '$action' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          userId: '$_id',
          name: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] },
          email: '$userDetails.email',
          actionCount: 1
        }
      },
      { $sort: { actionCount: -1 } }
    ]);

    return summary;
  }

  /**
   * Export logs to various formats
   */
  async exportLogs(organizationId, format = 'json', options = {}) {
    const logs = await AuditLog.exportLogs(organizationId, options);

    switch (format) {
      case 'csv':
        return this.convertToCSV(logs);
      case 'json':
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Convert logs to CSV
   */
  convertToCSV(logs) {
    if (!logs || logs.length === 0) return '';

    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Description',
      'Severity',
      'Status',
      'IP Address'
    ];

    const lines = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.createdAt?.toISOString() || '',
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        log.action,
        log.resourceType,
        log.resourceId?.toString() || '',
        log.resourceName || '',
        `"${(log.description || '').replace(/"/g, '""')}"`,
        log.severity,
        log.status,
        log.context?.ipAddress || ''
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Clean old logs
   */
  async cleanOldLogs(daysOld = 365) {
    return AuditLog.cleanOldLogs(daysOld);
  }

  /**
   * Get available action types
   */
  getActionTypes() {
    return ACTION_TYPES;
  }

  /**
   * Get available resource types
   */
  getResourceTypes() {
    return RESOURCE_TYPES;
  }

  /**
   * Get available severity levels
   */
  getSeverityLevels() {
    return SEVERITY_LEVELS;
  }

  /**
   * Express middleware for automatic request logging
   */
  middleware(options = {}) {
    const {
      excludePaths = ['/health', '/api/audit-logs'],
      logRequestBody = false,
      logResponseBody = false
    } = options;

    return async (req, res, next) => {
      // Skip excluded paths
      if (excludePaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      const startTime = Date.now();
      const originalEnd = res.end;

      // Capture response
      res.end = function (...args) {
        const duration = Date.now() - startTime;

        // Only log if user is authenticated
        if (req.user && req.user.organization) {
          // Determine action based on method and path
          let action = 'unknown';
          const method = req.method.toLowerCase();

          if (method === 'post') action = 'create';
          else if (method === 'put' || method === 'patch') action = 'update';
          else if (method === 'delete') action = 'delete';
          else if (method === 'get') action = 'read';

          // Extract resource type from path
          const pathParts = req.path.split('/').filter(Boolean);
          const resourceType = pathParts[1] || 'unknown'; // /api/resource-type/...

          // Log the request
          this.log({
            organization: req.user.organization,
            user: req.user._id,
            action,
            resourceType,
            resourceId: req.params?.id,
            context: {
              ipAddress: req.ip || req.headers['x-forwarded-for'],
              userAgent: req.headers['user-agent'],
              requestMethod: req.method,
              requestPath: req.path,
              requestId: req.id
            },
            metadata: {
              ...(logRequestBody && { requestBody: req.body }),
              ...(logResponseBody && { responseBody: args[0] })
            },
            status: res.statusCode < 400 ? 'success' : 'failure',
            duration
          }).catch(err => console.error('Audit log error:', err));
        }

        originalEnd.apply(res, args);
      }.bind(this);

      next();
    };
  }
}

export default new AuditService();