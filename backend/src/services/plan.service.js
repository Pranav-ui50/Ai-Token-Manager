/**
 * Plan Service
 *
 * Handles all subscription plan-related business logic.
 */

import Plan from '../models/Plan.js';
import Feature from '../models/Feature.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class PlanService {
  /**
   * Create a new plan
   * @param {Object} planData - Plan data
   * @returns {Object} Created plan
   */
  async createPlan(planData) {
    const { organization, name, features } = planData;

    // Check if plan with same name exists in organization
    const existingPlan = await Plan.findOne({ organization, name });
    if (existingPlan) {
      throw new AppError('Plan with this name already exists', 409, 'DUPLICATE_PLAN');
    }

    // Verify all features exist and belong to organization
    if (features && features.length > 0) {
      for (const featureConfig of features) {
        const feature = await Feature.findOne({
          _id: featureConfig.feature,
          organization
        });
        if (!feature) {
          throw new AppError(`Feature ${featureConfig.feature} not found`, 404, 'FEATURE_NOT_FOUND');
        }
      }
    }

    // Create plan
    const plan = await Plan.create({
      ...planData,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    });

    // Populate references
    await plan.populate('features.feature', 'name slug category tokenEstimates');

    // Calculate profitability
    await plan.calculateProfitability();

    logger.info(`Plan created: ${plan.name} for organization: ${organization}`);

    return plan;
  }

  /**
   * Get all plans for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Plans with pagination
   */
  async getPlans(organizationId, filters = {}) {
    const { page = 1, limit = 10, status, tier, public: isPublic } = filters;

    const query = { organization: organizationId };

    if (status) {
      query.status = status;
    }

    if (tier) {
      query.tier = tier;
    }

    if (isPublic !== undefined) {
      query['settings.isPublic'] = isPublic === 'true';
    }

    const skip = (page - 1) * limit;

    const plans = await Plan.find(query)
      .populate('features.feature', 'name slug category')
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Plan.countDocuments(query);

    return {
      plans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get public plans
   * @param {string} organizationId - Organization ID
   * @returns {Array} Public plans
   */
  async getPublicPlans(organizationId) {
    return Plan.find({
      organization: organizationId,
      status: 'active',
      'settings.isPublic': true
    })
      .populate('features.feature', 'name slug category')
      .sort({ displayOrder: 1 });
  }

  /**
   * Get plan by ID
   * @param {string} planId - Plan ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Plan
   */
  async getPlan(planId, organizationId) {
    const plan = await Plan.findOne({
      _id: planId,
      organization: organizationId
    }).populate('features.feature', 'name slug category tokenEstimates');

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    return plan;
  }

  /**
   * Get plan by slug
   * @param {string} slug - Plan slug
   * @param {string} organizationId - Organization ID
   * @returns {Object} Plan
   */
  async getPlanBySlug(slug, organizationId) {
    const plan = await Plan.findOne({
      slug,
      organization: organizationId
    }).populate('features.feature', 'name slug category tokenEstimates');

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    return plan;
  }

  /**
   * Update plan
   * @param {string} planId - Plan ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated plan
   */
  async updatePlan(planId, organizationId, updateData) {
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.organization;
    delete updateData.slug;
    delete updateData.stats;

    // Verify features if updating
    if (updateData.features && updateData.features.length > 0) {
      for (const featureConfig of updateData.features) {
        const feature = await Feature.findOne({
          _id: featureConfig.feature,
          organization: organizationId
        });
        if (!feature) {
          throw new AppError(`Feature ${featureConfig.feature} not found`, 404, 'FEATURE_NOT_FOUND');
        }
      }
    }

    const plan = await Plan.findOneAndUpdate(
      { _id: planId, organization: organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('features.feature', 'name slug category tokenEstimates');

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    // Recalculate profitability if features changed
    if (updateData.features || updateData.billing) {
      await plan.calculateProfitability();
    }

    logger.info(`Plan updated: ${plan.name}`);

    return plan;
  }

  /**
   * Delete plan
   * @param {string} planId - Plan ID
   * @param {string} organizationId - Organization ID
   * @returns {boolean} Success
   */
  async deletePlan(planId, organizationId) {
    const plan = await Plan.findOneAndDelete({
      _id: planId,
      organization: organizationId
    });

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    logger.info(`Plan deleted: ${plan.name}`);

    return true;
  }

  /**
   * Compare plans
   * @param {Array} planIds - Plan IDs to compare
   * @param {string} organizationId - Organization ID
   * @returns {Object} Comparison data
   */
  async comparePlans(planIds, organizationId) {
    const plans = await Plan.find({
      _id: { $in: planIds },
      organization: organizationId
    }).populate('features.feature', 'name slug category');

    if (plans.length === 0) {
      throw new AppError('No plans found', 404, 'PLANS_NOT_FOUND');
    }

    // Get all unique features across plans
    const allFeatures = new Map();
    plans.forEach(plan => {
      plan.features.forEach(f => {
        if (f.feature && !allFeatures.has(f.feature._id.toString())) {
          allFeatures.set(f.feature._id.toString(), f.feature);
        }
      });
    });

    // Build comparison matrix
    const comparison = {
      plans: plans.map(p => ({
        id: p._id,
        name: p.name,
        tier: p.tier,
        price: p.billing.price,
        currency: p.billing.currency,
        interval: p.billing.interval,
        features: p.features.map(f => ({
          id: f.feature?._id,
          enabled: f.enabled,
          limits: f.limits
        }))
      })),
      features: Array.from(allFeatures.values()),
      matrix: {}
    };

    // Build feature matrix
    allFeatures.forEach((feature, featureId) => {
      comparison.matrix[featureId] = plans.map(plan => {
        const planFeature = plan.features.find(f =>
          f.feature?._id?.toString() === featureId
        );
        return {
          included: !!planFeature?.enabled,
          limits: planFeature?.limits || null
        };
      });
    });

    return comparison;
  }

  /**
   * Get plan statistics
   * @param {string} organizationId - Organization ID
   * @returns {Object} Statistics
   */
  async getPlanStats(organizationId) {
    const stats = await Plan.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          activePlans: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalSubscribers: { $sum: '$stats.totalSubscribers' },
          activeSubscribers: { $sum: '$stats.activeSubscribers' },
          totalRevenue: { $sum: '$stats.totalRevenue' },
          totalMrr: { $sum: '$stats.mrr' }
        }
      }
    ]);

    // Plans by tier
    const tierStats = await Plan.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          avgPrice: { $avg: '$billing.price' }
        }
      }
    ]);

    // Plans by status
    const statusStats = await Plan.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = stats[0] || {
      totalPlans: 0,
      activePlans: 0,
      totalSubscribers: 0,
      activeSubscribers: 0,
      totalRevenue: 0,
      totalMrr: 0
    };

    result.byTier = tierStats.reduce((acc, tier) => {
      acc[tier._id] = { count: tier.count, avgPrice: tier.avgPrice };
      return acc;
    }, {});

    result.byStatus = statusStats.reduce((acc, status) => {
      acc[status._id] = status.count;
      return acc;
    }, {});

    return result;
  }

  /**
   * Clone a plan
   * @param {string} planId - Plan ID to clone
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Clone options
   * @returns {Object} Cloned plan
   */
  async clonePlan(planId, organizationId, options = {}) {
    const originalPlan = await this.getPlan(planId, organizationId);

    const newPlanData = {
      ...originalPlan.toObject(),
      name: options.name || `${originalPlan.name} (Copy)`,
      status: 'draft',
      'settings.isDefault': false,
      stats: {
        totalSubscribers: 0,
        activeSubscribers: 0,
        totalRevenue: 0,
        mrr: 0
      }
    };

    delete newPlanData._id;
    delete newPlanData.createdAt;
    delete newPlanData.updatedAt;

    const clonedPlan = await Plan.create(newPlanData);

    logger.info(`Plan cloned: ${originalPlan.name} -> ${clonedPlan.name}`);

    return clonedPlan;
  }

  /**
   * Update subscriber stats
   * @param {string} planId - Plan ID
   * @param {Object} statsUpdate - Stats update
   * @returns {Object} Updated plan
   */
  async updateSubscriberStats(planId, statsUpdate) {
    const plan = await Plan.findById(planId);

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    if (statsUpdate.subscribers !== undefined) {
      plan.stats.totalSubscribers = statsUpdate.subscribers;
    }

    if (statsUpdate.activeSubscribers !== undefined) {
      plan.stats.activeSubscribers = statsUpdate.activeSubscribers;
    }

    if (statsUpdate.revenue !== undefined) {
      plan.stats.totalRevenue += statsUpdate.revenue;
    }

    if (statsUpdate.mrr !== undefined) {
      plan.stats.mrr = statsUpdate.mrr;
    }

    await plan.save();

    return plan;
  }

  /**
   * Calculate profitability for all plans
   * @param {string} organizationId - Organization ID
   * @returns {Object} Calculation results
   */
  async calculateAllProfitability(organizationId) {
    const plans = await Plan.find({ organization: organizationId });

    const results = [];

    for (const plan of plans) {
      await plan.calculateProfitability();
      results.push({
        id: plan._id,
        name: plan.name,
        profitPerUser: plan.profitability.profitPerUser,
        grossMargin: plan.profitability.grossMargin,
        breakEvenUsers: plan.profitability.breakEvenUsers
      });
    }

    logger.info(`Calculated profitability for ${plans.length} plans`);

    return results;
  }
}

export default new PlanService();