/**
 * Real-time Controller
 *
 * Handles HTTP requests for real-time features including SSE fallback
 * and usage statistics endpoints.
 */

import realtimeService from '../services/realtime.service.js';
import Feature from '../models/Feature.js';
import Project from '../models/Project.js';
import Organization from '../models/Organization.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class RealtimeController {
  /**
   * Get real-time usage statistics
   * GET /api/realtime/usage
   */
  async getUsageStats(req, res, next) {
    try {
      const organizationId = req.user.organization;

      // Get organization with subscription info
      const organization = await Organization.findById(organizationId).lean();

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
            inputTokens: { $sum: '$stats.inputTokens' },
            outputTokens: { $sum: '$stats.outputTokens' },
            totalCost: { $sum: '$stats.totalCost' },
            avgLatency: { $avg: '$stats.avgLatency' },
            errorCount: { $sum: '$stats.errorCount' },
            featureCount: { $sum: 1 }
          }
        }
      ]);

      // Get per-feature breakdown
      const featuresByUsage = await Feature.aggregate([
        {
          $match: {
            organization: organization._id,
            isActive: true
          }
        },
        {
          $project: {
            name: 1,
            'stats.totalRequests': 1,
            'stats.totalTokens': 1,
            'stats.totalCost': 1
          }
        },
        {
          $sort: { 'stats.totalCost': -1 }
        },
        {
          $limit: 10
        }
      ]);

      // Get project count
      const projectCount = await Project.countDocuments({
        organization: organization._id,
        isActive: true
      });

      const stats = featureStats[0] || {
        totalRequests: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        avgLatency: 0,
        errorCount: 0,
        featureCount: 0
      };

      // Define plan limits
      const planLimits = {
        free: { apiCalls: 1000, tokens: 10000, features: 5, projects: 1 },
        starter: { apiCalls: 10000, tokens: 100000, features: 20, projects: 5 },
        professional: { apiCalls: 100000, tokens: 1000000, features: 100, projects: 20 },
        enterprise: { apiCalls: Infinity, tokens: Infinity, features: Infinity, projects: Infinity }
      };

      const plan = organization.subscription?.plan || 'free';
      const limits = planLimits[plan] || planLimits.free;

      // Calculate percentages
      const usage = {
        apiCalls: {
          used: stats.totalRequests,
          limit: limits.apiCalls === Infinity ? 'unlimited' : limits.apiCalls,
          percentage: limits.apiCalls === Infinity ? 0 : Math.round((stats.totalRequests / limits.apiCalls) * 100)
        },
        tokens: {
          used: stats.totalTokens,
          limit: limits.tokens === Infinity ? 'unlimited' : limits.tokens,
          percentage: limits.tokens === Infinity ? 0 : Math.round((stats.totalTokens / limits.tokens) * 100)
        },
        features: {
          used: stats.featureCount,
          limit: limits.features === Infinity ? 'unlimited' : limits.features,
          percentage: limits.features === Infinity ? 0 : Math.round((stats.featureCount / limits.features) * 100)
        },
        projects: {
          used: projectCount,
          limit: limits.projects === Infinity ? 'unlimited' : limits.projects,
          percentage: limits.projects === Infinity ? 0 : Math.round((projectCount / limits.projects) * 100)
        },
        cost: {
          total: stats.totalCost,
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          avgLatency: Math.round(stats.avgLatency || 0),
          errorRate: stats.totalRequests > 0
            ? ((stats.errorCount / stats.totalRequests) * 100).toFixed(2)
            : '0.00'
        }
      };

      res.status(200).json({
        success: true,
        data: {
          usage,
          plan: {
            name: plan,
            status: organization.subscription?.status || 'trial'
          },
          topFeatures: featuresByUsage,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get live token consumption stream (SSE fallback)
   * GET /api/realtime/stream
   */
  async getTokenStream(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { featureId, projectId } = req.query;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial connection event
      res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

      // Send periodic updates
      const intervalId = setInterval(async () => {
        try {
          // Get current usage
          const matchStage = { organization: organizationId, isActive: true };
          if (featureId) matchStage._id = featureId;

          const stats = await Feature.aggregate([
            { $match: matchStage },
            {
              $group: {
                _id: null,
                totalRequests: { $sum: '$stats.totalRequests' },
                totalTokens: { $sum: '$stats.totalTokens' },
                totalCost: { $sum: '$stats.totalCost' }
              }
            }
          ]);

          const data = stats[0] || { totalRequests: 0, totalTokens: 0, totalCost: 0 };

          res.write(`event: usage\ndata: ${JSON.stringify({
            ...data,
            featureId,
            projectId,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (err) {
          logger.error(`SSE error: ${err.message}`);
        }
      }, 5000); // Send updates every 5 seconds

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(intervalId);
        res.end();
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get live dashboard metrics
   * GET /api/realtime/dashboard
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const organizationId = req.user.organization;

      // Get current period metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Aggregate daily usage
      const dailyUsage = await Feature.aggregate([
        {
          $match: {
            organization: organizationId,
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: '$stats.totalRequests' },
            totalTokens: { $sum: '$stats.totalTokens' },
            totalCost: { $sum: '$stats.totalCost' },
            avgLatency: { $avg: '$stats.avgLatency' },
            errorCount: { $sum: '$stats.errorCount' }
          }
        }
      ]);

      // Get features by model
      const featuresByModel = await Feature.aggregate([
        {
          $match: {
            organization: organizationId,
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'aimodels',
            localField: 'model',
            foreignField: '_id',
            as: 'modelInfo'
          }
        },
        {
          $unwind: '$modelInfo'
        },
        {
          $group: {
            _id: '$modelInfo.provider',
            count: { $sum: 1 },
            requests: { $sum: '$stats.totalRequests' },
            tokens: { $sum: '$stats.totalTokens' },
            cost: { $sum: '$stats.totalCost' }
          }
        }
      ]);

      // Get top features by cost
      const topFeatures = await Feature.aggregate([
        {
          $match: {
            organization: organizationId,
            isActive: true
          }
        },
        {
          $sort: { 'stats.totalCost': -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            name: 1,
            'stats.totalRequests': 1,
            'stats.totalTokens': 1,
            'stats.totalCost': 1
          }
        }
      ]);

      const metrics = dailyUsage[0] || {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgLatency: 0,
        errorCount: 0
      };

      // Calculate error rate
      const errorRate = metrics.totalRequests > 0
        ? ((metrics.errorCount / metrics.totalRequests) * 100).toFixed(2)
        : '0.00';

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalRequests: metrics.totalRequests,
            totalTokens: metrics.totalTokens,
            totalCost: metrics.totalCost,
            avgLatency: Math.round(metrics.avgLatency || 0),
            errorRate: parseFloat(errorRate)
          },
          byProvider: featuresByModel,
          topFeatures,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start real-time monitoring for organization
   * POST /api/realtime/monitoring/start
   */
  async startMonitoring(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { intervalMs = 30000 } = req.body;

      await realtimeService.startUsageMonitoring(organizationId, intervalMs);

      res.status(200).json({
        success: true,
        message: 'Real-time monitoring started',
        data: {
          organizationId,
          intervalMs
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stop real-time monitoring for organization
   * POST /api/realtime/monitoring/stop
   */
  async stopMonitoring(req, res, next) {
    try {
      const organizationId = req.user.organization;

      realtimeService.stopUsageMonitoring(organizationId);

      res.status(200).json({
        success: true,
        message: 'Real-time monitoring stopped'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection statistics
   * GET /api/realtime/stats
   */
  async getConnectionStats(req, res, next) {
    try {
      const stats = realtimeService.getConnectionStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get live feature usage
   * GET /api/realtime/features/:featureId/usage
   */
  async getFeatureLiveUsage(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { featureId } = req.params;

      const feature = await Feature.findOne({
        _id: featureId,
        organization: organizationId
      }).lean();

      if (!feature) {
        throw new AppError('Feature not found', 404, 'NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: {
          featureId: feature._id,
          name: feature.name,
          stats: feature.stats,
          isActive: feature.isActive,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Broadcast event to organization (admin only)
   * POST /api/realtime/broadcast
   */
  async broadcastToOrganization(req, res, next) {
    try {
      const { organizationId, event, data } = req.body;

      // Only super admin or org owner can broadcast
      if (!req.user.roles?.some(r => ['super_admin', 'org_owner'].includes(r))) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      realtimeService.emitOrganizationNotification(organizationId, {
        event,
        data
      });

      res.status(200).json({
        success: true,
        message: 'Broadcast sent successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RealtimeController();