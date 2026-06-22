/**
 * Limit Service
 *
 * Handles plan limit checks for organizations.
 * Validates resource creation against plan limits.
 */

import Plan from '../models/Plan.js';
import Organization from '../models/Organization.js';
import Project from '../models/Project.js';
import Feature from '../models/Feature.js';
import Simulation from '../models/Simulation.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class LimitService {
  /**
   * Get the plan for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Object|null} Plan document or null
   */
  async getOrganizationPlan(organizationId) {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return null;
    }

    // Get plan from subscription
    const planId = organization.subscription?.planId;
    const planTier = organization.subscription?.plan;

    logger.info(`[LimitService] Looking for plan: planId=${planId}, tier=${planTier}, orgId=${organizationId}`);

    let plan = null;

    // Try to find plan by ID first (if planId is a valid ObjectId)
    if (planId && /^[0-9a-fA-F]{24}$/.test(planId)) {
      plan = await Plan.findById(planId);
      if (plan) {
        logger.info(`[LimitService] Found plan by ID: ${plan._id}, tier: ${plan.tier}, limits:`, plan.limits);
      }
    }

    // If not found by ID, try finding by tier
    if (!plan && planTier) {
      // First try organization-specific plan
      plan = await Plan.findOne({
        tier: planTier.toLowerCase(),
        organization: organizationId,
        status: 'active'
      });

      if (plan) {
        logger.info(`[LimitService] Found org-specific plan by tier: ${plan._id}, tier: ${plan.tier}, limits:`, plan.limits);
      } else {
        // Try public plans
        plan = await Plan.findOne({
          tier: planTier.toLowerCase(),
          'settings.isPublic': true,
          status: 'active'
        });

        if (plan) {
          logger.info(`[LimitService] Found public plan by tier: ${plan._id}, tier: ${plan.tier}, limits:`, plan.limits);
        } else {
          // Last resort: any plan with this tier
          plan = await Plan.findOne({
            tier: planTier.toLowerCase(),
            status: 'active'
          });
          if (plan) {
            logger.info(`[LimitService] Found any plan by tier: ${plan._id}, tier: ${plan.tier}, limits:`, plan.limits);
          }
        }
      }
    }

    // If still not found, try to get default plan
    if (!plan) {
      plan = await Plan.findOne({
        'settings.isDefault': true,
        status: 'active'
      });
      if (plan) {
        logger.info(`[LimitService] Found default plan: ${plan._id}, tier: ${plan.tier}, limits:`, plan.limits);
      }
    }

    if (!plan) {
      logger.warn(`[LimitService] No plan found for organization ${organizationId}, tier=${planTier}`);
    }

    return plan;
  }

  /**
   * Get plan limits for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Object} Limits object with default values
   */
  async getPlanLimits(organizationId) {
    const plan = await this.getOrganizationPlan(organizationId);

    if (!plan) {
      logger.warn(`[LimitService] No plan found for organization ${organizationId}, using default limits`);
      // Default fallback limits for free/trial users
      return {
        maxProjects: 1,
        maxFeatures: 5,
        maxSimulations: 10,
        maxUsers: 1,
        maxApiCalls: 1000,
        maxTokens: 10000
      };
    }

    logger.info(`[LimitService] Extracting limits from plan ${plan._id} (${plan.tier}):`, plan.limits);

    // Extract limits from plan, null means unlimited
    return {
      maxProjects: plan.limits?.maxProjects ?? null,
      maxFeatures: plan.limits?.maxFeatures ?? null,
      maxSimulations: plan.limits?.maxSimulations ?? null,
      maxUsers: plan.limits?.maxUsers ?? null,
      maxApiCalls: plan.limits?.maxApiCalls ?? null,
      maxTokens: plan.limits?.maxTokens ?? plan.credits?.includedCredits ?? null
    };
  }

  /**
   * Get current usage for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Object} Current usage counts
   */
  async getCurrentUsage(organizationId) {
    const organization = await Organization.findById(organizationId);

    // Count only active (non-disabled) resources
    // Projects: status in ['active', 'inactive'] (not 'disabled')
    const [projectCount, featureCount, simulationCount] = await Promise.all([
      Project.countDocuments({
        organization: organizationId,
        status: { $in: ['active', 'inactive'] }
      }),
      Feature.countDocuments({
        organization: organizationId,
        status: { $in: ['active', 'inactive', 'maintenance'] }
      }),
      Simulation.countDocuments({
        organization: organizationId,
        status: { $in: ['draft', 'pending', 'running', 'completed', 'failed'] }
      })
    ]);

    // Count active team members (excluding disabled)
    const activeTeamMembers = organization?.members?.filter(
      m => m.status === 'active' || m.status === 'inactive'
    ).length || 0;

    // Get API calls and tokens from feature stats
    const featureUsage = await Feature.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $ne: 'disabled' }  // Exclude disabled features
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$stats.totalRequests' },
          totalTokens: { $sum: '$stats.totalTokens' }
        }
      }
    ]);

    const usage = featureUsage[0] || { totalRequests: 0, totalTokens: 0 };

    return {
      projects: projectCount,
      features: featureCount,
      simulations: simulationCount,
      teamMembers: activeTeamMembers,
      apiCalls: usage.totalRequests,
      tokens: usage.totalTokens
    };
  }

  /**
   * Check if a limit would be exceeded
   * @param {string} organizationId - Organization ID
   * @param {string} limitType - Type of limit (projects, features, simulations, teamMembers, apiCalls, tokens)
   * @param {number} additionalCount - Additional count to add (default: 1)
   * @returns {Object} { allowed: boolean, current: number, limit: number|null, message: string }
   */
  async checkLimit(organizationId, limitType, additionalCount = 1) {
    const [limits, usage] = await Promise.all([
      this.getPlanLimits(organizationId),
      this.getCurrentUsage(organizationId)
    ]);

    const limitMap = {
      projects: { limit: limits.maxProjects, usage: usage.projects },
      features: { limit: limits.maxFeatures, usage: usage.features },
      simulations: { limit: limits.maxSimulations, usage: usage.simulations },
      teamMembers: { limit: limits.maxUsers, usage: usage.teamMembers },
      apiCalls: { limit: limits.maxApiCalls, usage: usage.apiCalls },
      tokens: { limit: limits.maxTokens, usage: usage.tokens }
    };

    const limitInfo = limitMap[limitType];
    if (!limitInfo) {
      throw new Error(`Unknown limit type: ${limitType}`);
    }

    const { limit, usage: currentUsage } = limitInfo;

    // No limit set (unlimited)
    if (limit === null || limit === undefined) {
      return {
        allowed: true,
        current: currentUsage,
        limit: null,
        remaining: null,
        message: 'No limit set'
      };
    }

    const newCount = currentUsage + additionalCount;
    const wouldExceed = newCount > limit;
    const remaining = Math.max(0, limit - currentUsage);

    return {
      allowed: !wouldExceed,
      current: currentUsage,
      limit: limit,
      remaining: remaining,
      wouldBe: newCount,
      message: wouldExceed
        ? `Limit reached. Upgrade to continue.`
        : `You have ${remaining} ${limitType} remaining on your current plan.`
    };
  }

  /**
   * Validate and throw error if limit exceeded
   * @param {string} organizationId - Organization ID
   * @param {string} limitType - Type of limit
   * @param {number} additionalCount - Additional count to add
   * @throws {AppError} If limit exceeded
   */
  async validateLimit(organizationId, limitType, additionalCount = 1) {
    const result = await this.checkLimit(organizationId, limitType, additionalCount);

    if (!result.allowed) {
      throw new AppError(
        result.message,
        403,
        'LIMIT_EXCEEDED',
        {
          limitType,
          current: result.current,
          limit: result.limit,
          additional: additionalCount
        }
      );
    }

    return result;
  }

  /**
   * Check multiple limits at once
   * @param {string} organizationId - Organization ID
   * @param {Array<{type: string, count: number}>} limits - Limits to check
   * @returns {Object} Results for each limit
   */
  async checkMultipleLimits(organizationId, limits) {
    const results = {};

    for (const { type, count = 1 } of limits) {
      results[type] = await this.checkLimit(organizationId, type, count);
    }

    return results;
  }

  /**
   * Get limit status for organization (for display purposes)
   * @param {string} organizationId - Organization ID
   * @returns {Object} Detailed limit status
   */
  async getLimitStatus(organizationId) {
    const [limits, usage] = await Promise.all([
      this.getPlanLimits(organizationId),
      this.getCurrentUsage(organizationId)
    ]);

    const limitTypes = ['projects', 'features', 'simulations', 'teamMembers', 'apiCalls', 'tokens'];
    const status = {};

    for (const type of limitTypes) {
      const limitKey = `max${type.charAt(0).toUpperCase() + type.slice(1)}`.replace('teamMembers', 'Users');
      const actualLimitKey = type === 'teamMembers' ? 'maxUsers' : `max${type.charAt(0).toUpperCase() + type.slice(1)}`;

      const limit = limits[actualLimitKey];
      const current = usage[type];

      const percentage = limit ? Math.round((current / limit) * 100) : 0;

      status[type] = {
        current,
        limit,
        remaining: limit ? Math.max(0, limit - current) : null,
        percentage,
        isUnlimited: !limit,
        isNearLimit: limit ? percentage >= 80 : false,
        isExceeded: limit ? current >= limit : false
      };
    }

    return status;
  }

  /**
   * Middleware factory for checking limits
   * @param {string} limitType - Type of limit to check
   * @param {number} count - Number to add (default: 1)
   * @returns {Function} Express middleware
   */
  createLimitMiddleware(limitType, count = 1) {
    return async (req, res, next) => {
      try {
        const organizationId = req.organization?._id || req.params.organizationId || req.body.organization;

        if (!organizationId) {
          return next();
        }

        await this.validateLimit(organizationId, limitType, count);
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

export default new LimitService();