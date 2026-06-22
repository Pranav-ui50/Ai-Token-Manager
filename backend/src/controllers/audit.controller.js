import auditService from '../services/audit.service.js';
import { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } from '../models/AuditLog.js';
import { ROLES, ROLE_AUDIT_RESOURCES, ROLE_AUDIT_ACTIONS } from '../utils/constants.js';

class AuditController {
  /**
   * Get audit logs
   * GET /api/audit-logs
   */
  async getLogs(req, res) {
    try {
      // Get organization from user, or use userId if no organization
      const organization = req.user.organization?._id || req.user.organization;
      const userId = req.user.id || req.user.userId;
      const userRole = req.user.role?.name || 'viewer';

      console.log('[Audit] getLogs called - organization:', organization, 'userId:', userId, 'role:', userRole);

      const {
        action,
        resourceType,
        resourceId,
        severity,
        status,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
        sort = '-createdAt'
      } = req.query;

      // Apply role-based filtering for Developer role
      // Developers can only see logs related to their resources
      let allowedResources = null;
      let allowedActions = null;

      // Get the role-based restrictions
      if (ROLE_AUDIT_RESOURCES[userRole]) {
        allowedResources = ROLE_AUDIT_RESOURCES[userRole];
      }

      if (ROLE_AUDIT_ACTIONS[userRole]) {
        allowedActions = ROLE_AUDIT_ACTIONS[userRole];
      }

      // If user has no organization, filter by user ID instead
      const options = {
        action,
        resourceType,
        resourceId,
        severity,
        status,
        startDate,
        endDate,
        search,
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        allowedResources,
        allowedActions,
        filterByUserId: userRole === ROLES.DEVELOPER ? userId : null // For Developer role, filter auth logs by user
      };

      let result;
      if (organization) {
        console.log('[Audit] Fetching logs for organization:', organization, 'with role restrictions:', { allowedResources, allowedActions });
        result = await auditService.getLogs(organization, options);
      } else {
        console.log('[Audit] Fetching logs for user:', userId);
        // User without organization - get their own logs
        result = await auditService.getUserLogs(userId, options);
      }

      console.log('[Audit] Found', result.logs.length, 'logs');

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[Audit] Error fetching logs:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get log by ID
   * GET /api/audit-logs/:id
   */
  async getLogById(req, res) {
    try {
      const { organization } = req.user;
      const { id } = req.params;

      const AuditLog = (await import('../models/AuditLog.js')).default;
      const log = await AuditLog.findOne({
        _id: id,
        organization
      })
        .populate('user', 'firstName lastName email')
        .populate('organization', 'name');

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get logs for a specific user
   * GET /api/audit-logs/user/:userId
   */
  async getUserLogs(req, res) {
    try {
      const { organization } = req.user;
      const { userId } = req.params;
      const { page = 1, limit = 50, sort = '-createdAt' } = req.query;

      // Verify user belongs to same organization
      const User = (await import('../models/User.js')).default;
      const targetUser = await User.findById(userId);

      if (!targetUser || targetUser.organization.toString() !== organization.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await auditService.getUserLogs(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get logs for a specific resource
   * GET /api/audit-logs/resource/:type/:id
   */
  async getResourceLogs(req, res) {
    try {
      const { organization } = req.user;
      const { type, id } = req.params;
      const { page = 1, limit = 50, sort = '-createdAt' } = req.query;

      // Validate resource type
      if (!RESOURCE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid resource type. Valid types: ${RESOURCE_TYPES.join(', ')}`
        });
      }

      const result = await auditService.getResourceLogs(type, id, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get recent activity
   * GET /api/audit-logs/recent
   */
  async getRecentActivity(req, res) {
    try {
      const { organization } = req.user;
      const { limit = 10 } = req.query;

      const logs = await auditService.getRecentActivity(organization, parseInt(limit));

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get statistics
   * GET /api/audit-logs/statistics
   */
  async getStatistics(req, res) {
    try {
      const { organization } = req.user;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }

      const stats = await auditService.getStatistics(organization, startDate, endDate);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get action summary
   * GET /api/audit-logs/summary/actions
   */
  async getActionSummary(req, res) {
    try {
      const { organization } = req.user;
      const { startDate, endDate } = req.query;

      const summary = await auditService.getActionSummary(
        organization,
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date()
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get resource summary
   * GET /api/audit-logs/summary/resources
   */
  async getResourceSummary(req, res) {
    try {
      const { organization } = req.user;
      const { startDate, endDate } = req.query;

      const summary = await auditService.getResourceSummary(
        organization,
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date()
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get user activity summary
   * GET /api/audit-logs/summary/users
   */
  async getUserActivitySummary(req, res) {
    try {
      const { organization } = req.user;
      const { startDate, endDate } = req.query;

      const summary = await auditService.getUserActivitySummary(
        organization,
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate || new Date()
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Export logs
   * GET /api/audit-logs/export
   */
  async exportLogs(req, res) {
    try {
      const { organization } = req.user;
      const {
        format = 'json',
        action,
        resourceType,
        resourceId,
        userId,
        severity,
        status,
        startDate,
        endDate,
        search
      } = req.query;

      const data = await auditService.exportLogs(organization, format, {
        action,
        resourceType,
        resourceId,
        userId,
        severity,
        status,
        startDate,
        endDate,
        search
      });

      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      const extension = format === 'csv' ? 'csv' : 'json';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.${extension}"`);
      res.send(data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get available action types
   * GET /api/audit-logs/types/actions
   */
  async getActionTypes(req, res) {
    res.json({
      success: true,
      data: ACTION_TYPES
    });
  }

  /**
   * Get available resource types
   * GET /api/audit-logs/types/resources
   */
  async getResourceTypes(req, res) {
    res.json({
      success: true,
      data: RESOURCE_TYPES
    });
  }

  /**
   * Get available severity levels
   * GET /api/audit-logs/types/severity
   */
  async getSeverityLevels(req, res) {
    res.json({
      success: true,
      data: SEVERITY_LEVELS
    });
  }

  /**
   * Create a manual audit log entry
   * POST /api/audit-logs
   */
  async createLog(req, res) {
    try {
      const { organization } = req.user;
      const userId = req.user._id;

      const {
        action,
        resourceType,
        resourceId,
        resourceName,
        description,
        severity,
        metadata,
        tags
      } = req.body;

      // Validate action
      if (!ACTION_TYPES.includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action. Valid actions: ${ACTION_TYPES.join(', ')}`
        });
      }

      // Validate resource type
      if (!RESOURCE_TYPES.includes(resourceType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid resource type. Valid types: ${RESOURCE_TYPES.join(', ')}`
        });
      }

      const log = await auditService.log({
        organization,
        user: userId,
        action,
        resourceType,
        resourceId,
        resourceName,
        description,
        severity: severity || 'info',
        status: 'success',
        context: {
          ipAddress: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
          requestMethod: req.method,
          requestPath: req.path
        },
        metadata,
        tags
      });

      res.status(201).json({
        success: true,
        data: log
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete old logs (admin only)
   * DELETE /api/audit-logs/cleanup
   */
  async cleanupLogs(req, res) {
    try {
      const { daysOld = 365 } = req.body;

      const result = await auditService.cleanOldLogs(daysOld);

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} audit logs older than ${daysOld} days`,
        data: {
          deletedCount: result.deletedCount,
          daysOld
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new AuditController();