/**
 * Usage Tracking Service
 *
 * Consolidated service for tracking storage, API calls, and token usage.
 * Integrates with subscription limits and enforcement.
 */

import Organization from '../models/Organization.js';
import Feature from '../models/Feature.js';
import Project from '../models/Project.js';
import Simulation from '../models/Simulation.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import limitService from './limit.service.js';

class UsageTrackingService {
  /**
   * Get comprehensive usage summary for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Object} Usage summary
   */
  async getUsageSummary(organizationId) {
    const organization = await Organization.findById(organizationId)
      .populate('subscription.planId');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get current usage from limit service
    const usage = await limitService.getCurrentUsage(organizationId);
    const limits = await limitService.getPlanLimits(organizationId);
    const limitStatus = await limitService.getLimitStatus(organizationId);

    // Calculate storage usage
    const storageUsage = await this.getStorageUsage(organizationId);

    // Get subscription details
    const subscription = organization.subscription;
    const plan = subscription?.planId;

    // Calculate billing period progress
    const now = new Date();
    const periodStart = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart) : null;
    const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;

    let daysRemaining = 0;
    let periodProgress = 0;

    if (periodStart && periodEnd) {
      const totalDays = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60 * 1000));
      const daysPassed = Math.ceil((now - periodStart) / (24 * 60 * 60 * 1000));
      daysRemaining = Math.max(0, totalDays - daysPassed);
      periodProgress = Math.min(100, Math.round((daysPassed / totalDays) * 100));
    }

    return {
      organization: {
        id: organization._id,
        name: organization.name
      },
      subscription: {
        plan: plan?.name || 'Free',
        tier: subscription?.plan || 'starter',
        status: subscription?.status || 'trial',
        billingCycle: subscription?.billingCycle || 'monthly',
        periodStart,
        periodEnd,
        daysRemaining,
        periodProgress
      },
      usage: {
        projects: {
          current: usage.projects,
          limit: limits.maxProjects,
          percentage: limitStatus.projects?.percentage || 0,
          isNearLimit: limitStatus.projects?.isNearLimit || false,
          isExceeded: limitStatus.projects?.isExceeded || false
        },
        features: {
          current: usage.features,
          limit: limits.maxFeatures,
          percentage: limitStatus.features?.percentage || 0,
          isNearLimit: limitStatus.features?.isNearLimit || false,
          isExceeded: limitStatus.features?.isExceeded || false
        },
        simulations: {
          current: usage.simulations,
          limit: limits.maxSimulations,
          percentage: limitStatus.simulations?.percentage || 0,
          isNearLimit: limitStatus.simulations?.isNearLimit || false,
          isExceeded: limitStatus.simulations?.isExceeded || false
        },
        teamMembers: {
          current: usage.teamMembers + 1, // Include owner
          limit: limits.maxUsers,
          percentage: limitStatus.teamMembers?.percentage || 0,
          isNearLimit: limitStatus.teamMembers?.isNearLimit || false,
          isExceeded: limitStatus.teamMembers?.isExceeded || false
        },
        apiCalls: {
          current: usage.apiCalls,
          limit: limits.maxApiCalls,
          percentage: limitStatus.apiCalls?.percentage || 0,
          isNearLimit: limitStatus.apiCalls?.isNearLimit || false,
          isExceeded: limitStatus.apiCalls?.isExceeded || false
        },
        tokens: {
          current: usage.tokens,
          limit: limits.maxTokens,
          percentage: limitStatus.tokens?.percentage || 0,
          isNearLimit: limitStatus.tokens?.isNearLimit || false,
          isExceeded: limitStatus.tokens?.isExceeded || false
        },
        storage: storageUsage
      }
    };
  }

  /**
   * Get storage usage for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Object} Storage usage details
   */
  async getStorageUsage(organizationId) {
    // Get all projects for the organization
    const projects = await Project.find({ organization: organizationId, isActive: true });

    // Get all features for storage calculation
    const features = await Feature.find({ organization: organizationId, status: 'active' });

    // Calculate storage from features (feature data, logs, etc.)
    let totalStorageBytes = 0;

    for (const feature of features) {
      // Feature configuration storage (rough estimate)
      if (feature.configuration) {
        totalStorageBytes += JSON.stringify(feature.configuration).length;
      }

      // Usage history storage
      if (feature.usageHistory) {
        totalStorageBytes += feature.usageHistory.reduce((sum, entry) =>
          sum + JSON.stringify(entry).length, 0);
      }

      // Logs storage
      if (feature.logs) {
        totalStorageBytes += feature.logs.reduce((sum, log) =>
          sum + JSON.stringify(log).length, 0);
      }
    }

    // Get simulation storage
    const simulations = await Simulation.find({ organization: organizationId });
    for (const sim of simulations) {
      if (sim.parameters) {
        totalStorageBytes += JSON.stringify(sim.parameters).length;
      }
      if (sim.results) {
        totalStorageBytes += JSON.stringify(sim.results).length;
      }
    }

    // Convert to MB
    const storageMB = totalStorageBytes / (1024 * 1024);

    // Get plan storage limit
    const organization = await Organization.findById(organizationId).populate('subscription.planId');
    const plan = organization?.subscription?.planId;
    const maxStorageMB = plan?.limits?.maxStorage || null; // null = unlimited

    return {
      bytes: totalStorageBytes,
      kilobytes: totalStorageBytes / 1024,
      megabytes: storageMB,
      gigabytes: storageMB / 1024,
      limitMB: maxStorageMB,
      percentage: maxStorageMB ? Math.round((storageMB / maxStorageMB) * 100) : 0,
      isNearLimit: maxStorageMB ? (storageMB / maxStorageMB) >= 0.8 : false,
      isExceeded: maxStorageMB ? storageMB >= maxStorageMB : false
    };
  }

  /**
   * Track API call usage
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID (optional)
   * @param {Object} usageData - Usage data
   * @returns {Object} Tracking result
   */
  async trackApiUsage(organizationId, featureId = null, usageData = {}) {
    const { requests = 1, tokens = 0, inputTokens = 0, outputTokens = 0, cost = 0 } = usageData;

    // Check limits first
    try {
      if (requests > 0) {
        await limitService.validateLimit(organizationId, 'apiCalls', requests);
      }
      if (tokens > 0) {
        await limitService.validateLimit(organizationId, 'tokens', tokens);
      }
    } catch (error) {
      logger.warn(`[UsageTracking] Limit exceeded for org ${organizationId}: ${error.message}`);
      throw error;
    }

    // Update feature stats if featureId provided
    if (featureId) {
      const feature = await Feature.findById(featureId);
      if (feature && feature.organization.toString() === organizationId) {
        feature.stats.totalRequests = (feature.stats.totalRequests || 0) + requests;
        feature.stats.totalTokens = (feature.stats.totalTokens || 0) + tokens;
        feature.stats.totalCost = (feature.stats.totalCost || 0) + cost;
        feature.stats.lastUsedAt = new Date();

        // Add to usage history
        feature.usageHistory.push({
          date: new Date(),
          requests,
          tokens,
          inputTokens,
          outputTokens,
          cost,
          errorCount: 0,
          avgLatency: usageData.latency || 0
        });

        // Keep only last 90 days
        if (feature.usageHistory.length > 90) {
          feature.usageHistory = feature.usageHistory.slice(-90);
        }

        await feature.save();
      }
    }

    // Log audit
    await AuditLog.log({
      organization: organizationId,
      action: 'api_usage_tracked',
      resourceType: 'feature',
      resourceId: featureId,
      description: `API usage: ${requests} requests, ${tokens} tokens`,
      afterState: { requests, tokens, inputTokens, outputTokens, cost }
    });

    return {
      tracked: true,
      requests,
      tokens,
      inputTokens,
      outputTokens,
      cost
    };
  }

  /**
   * Get usage history for a specific period
   * @param {string} organizationId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Usage history
   */
  async getUsageHistory(organizationId, startDate, endDate) {
    const features = await Feature.find({ organization: organizationId });

    const usageHistory = {
      byDate: [],
      byFeature: [],
      totals: {
        requests: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0
      }
    };

    // Aggregate usage by date
    const dateMap = new Map();
    const featureMap = new Map();

    for (const feature of features) {
      const featureUsage = {
        featureId: feature._id,
        featureName: feature.name,
        requests: 0,
        tokens: 0,
        cost: 0
      };

      for (const usage of feature.usageHistory || []) {
        const usageDate = new Date(usage.date);
        if (usageDate >= startDate && usageDate <= endDate) {
          // Add to date aggregation
          const dateKey = usageDate.toISOString().split('T')[0];
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: dateKey,
              requests: 0,
              tokens: 0,
              cost: 0
            });
          }
          const dateData = dateMap.get(dateKey);
          dateData.requests += usage.requests || 0;
          dateData.tokens += usage.tokens || 0;
          dateData.cost += usage.cost || 0;

          // Add to feature aggregation
          featureUsage.requests += usage.requests || 0;
          featureUsage.tokens += usage.tokens || 0;
          featureUsage.cost += usage.cost || 0;

          // Add to totals
          usageHistory.totals.requests += usage.requests || 0;
          usageHistory.totals.tokens += usage.tokens || 0;
          usageHistory.totals.inputTokens += usage.inputTokens || 0;
          usageHistory.totals.outputTokens += usage.outputTokens || 0;
          usageHistory.totals.cost += usage.cost || 0;
        }
      }

      if (featureUsage.requests > 0) {
        featureMap.set(feature._id.toString(), featureUsage);
      }
    }

    usageHistory.byDate = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date) - new Date(b.date));
    usageHistory.byFeature = Array.from(featureMap.values());

    return usageHistory;
  }

  /**
   * Check if usage alerts should be sent
   * @param {string} organizationId - Organization ID
   * @param {string} type - Alert type (apiCalls, tokens, storage, etc.)
   * @returns {Object} Alert check result
   */
  async checkUsageAlerts(organizationId, type = 'all') {
    const limitStatus = await limitService.getLimitStatus(organizationId);
    const alerts = [];

    const checkType = (statusType, typeName, threshold = 80) => {
      const status = limitStatus[statusType];
      if (status && status.percentage >= threshold && !status.isUnlimited) {
        alerts.push({
          type: typeName,
          current: status.current,
          limit: status.limit,
          percentage: status.percentage,
          isExceeded: status.isExceeded,
          message: status.isExceeded
            ? `${typeName} limit exceeded: ${status.current}/${status.limit}`
            : `${typeName} usage at ${status.percentage}% of limit`
        });
      }
    };

    if (type === 'all' || type === 'projects') {
      checkType('projects', 'Projects');
    }
    if (type === 'all' || type === 'features') {
      checkType('features', 'Features');
    }
    if (type === 'all' || type === 'simulations') {
      checkType('simulations', 'Simulations');
    }
    if (type === 'all' || type === 'teamMembers') {
      checkType('teamMembers', 'Team members');
    }
    if (type === 'all' || type === 'apiCalls') {
      checkType('apiCalls', 'API calls');
    }
    if (type === 'all' || type === 'tokens') {
      checkType('tokens', 'Tokens');
    }

    return {
      hasAlerts: alerts.length > 0,
      alerts,
      criticalAlerts: alerts.filter(a => a.isExceeded || a.percentage >= 90)
    };
  }

  /**
   * Get usage forecast based on historical data
   * @param {string} organizationId - Organization ID
   * @returns {Object} Usage forecast
   */
  async getUsageForecast(organizationId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Get usage for the last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);

    const usageHistory = await this.getUsageHistory(organizationId, startDate, endDate);

    // Calculate average daily usage
    const daysWithData = usageHistory.byDate.length || 1;
    const avgDailyRequests = usageHistory.totals.requests / daysWithData;
    const avgDailyTokens = usageHistory.totals.tokens / daysWithData;

    // Get period end date
    const periodEnd = organization.subscription?.currentPeriodEnd
      ? new Date(organization.subscription.currentPeriodEnd)
      : new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const daysRemaining = Math.max(1, Math.ceil((periodEnd - endDate) / (24 * 60 * 60 * 1000)));

    // Get current usage
    const currentUsage = await limitService.getCurrentUsage(organizationId);
    const limits = await limitService.getPlanLimits(organizationId);

    // Forecast remaining period
    const forecastRequests = currentUsage.apiCalls + (avgDailyRequests * daysRemaining);
    const forecastTokens = currentUsage.tokens + (avgDailyTokens * daysRemaining);

    // Check if forecast exceeds limits
    const requestLimit = limits.maxApiCalls;
    const tokenLimit = limits.maxTokens;

    return {
      currentUsage: {
        requests: currentUsage.apiCalls,
        tokens: currentUsage.tokens
      },
      dailyAverage: {
        requests: Math.round(avgDailyRequests),
        tokens: Math.round(avgDailyTokens)
      },
      forecast: {
        requests: Math.round(forecastRequests),
        tokens: Math.round(forecastTokens),
        willExceedRequests: requestLimit ? forecastRequests > requestLimit : false,
        willExceedTokens: tokenLimit ? forecastTokens > tokenLimit : false
      },
      limits: {
        requests: requestLimit,
        tokens: tokenLimit
      },
      periodEnd,
      daysRemaining,
      recommendation: this._generateRecommendation(
        forecastRequests, forecastTokens, requestLimit, tokenLimit
      )
    };
  }

  /**
   * Generate recommendation based on usage forecast
   */
  _generateRecommendation(forecastRequests, forecastTokens, requestLimit, tokenLimit) {
    const recommendations = [];

    if (requestLimit && forecastRequests > requestLimit) {
      const overagePercent = Math.round(((forecastRequests - requestLimit) / requestLimit) * 100);
      recommendations.push({
        type: 'api_calls',
        severity: overagePercent > 50 ? 'high' : overagePercent > 20 ? 'medium' : 'low',
        message: `Projected to exceed API call limit by ${overagePercent}%`,
        suggestion: 'Consider upgrading your plan or reducing API usage'
      });
    }

    if (tokenLimit && forecastTokens > tokenLimit) {
      const overagePercent = Math.round(((forecastTokens - tokenLimit) / tokenLimit) * 100);
      recommendations.push({
        type: 'tokens',
        severity: overagePercent > 50 ? 'high' : overagePercent > 20 ? 'medium' : 'low',
        message: `Projected to exceed token limit by ${overagePercent}%`,
        suggestion: 'Consider upgrading your plan or optimizing token usage'
      });
    }

    return recommendations;
  }

  /**
   * Reset usage counters for new billing period
   * @param {string} organizationId - Organization ID
   * @returns {Object} Reset result
   */
  async resetUsageCounters(organizationId) {
    // This would typically be called at the start of a new billing period
    // For now, we'll just log it
    logger.info(`[UsageTracking] Usage counters reset for organization ${organizationId}`);

    await AuditLog.log({
      organization: organizationId,
      action: 'usage_counters_reset',
      resourceType: 'organization',
      description: 'Usage counters reset for new billing period'
    });

    return { reset: true, resetAt: new Date() };
  }
}

export default new UsageTrackingService();