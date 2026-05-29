/**
 * Analytics Job Processor
 *
 * Processes analytics aggregation jobs for dashboards and reports.
 */

import logger from '../config/logger.js';
import Feature from '../models/Feature.js';
import Plan from '../models/Plan.js';
import Simulation from '../models/Simulation.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

/**
 * Analytics job types
 */
const ANALYTICS_TYPES = {
  DAILY_AGGREGATION: 'daily_aggregation',
  WEEKLY_AGGREGATION: 'weekly_aggregation',
  MONTHLY_AGGREGATION: 'monthly_aggregation',
  COST_TRENDS: 'cost_trends',
  USAGE_PATTERNS: 'usage_patterns',
  PROFITABILITY_METRICS: 'profitability_metrics',
  ORGANIZATION_METRICS: 'organization_metrics',
  FEATURE_PERFORMANCE: 'feature_performance'
};

/**
 * Process analytics job
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>}
 */
async function processAnalyticsJob(data, job) {
  const {
    organizationId,
    type,
    parameters = {},
    options = {}
  } = data;

  logger.info(`Processing analytics job: ${type} for organization ${organizationId || 'all'}`);

  try {
    // Update job progress
    if (job) {
      job.progress(10);
    }

    let result;

    switch (type) {
      case ANALYTICS_TYPES.DAILY_AGGREGATION:
        result = await aggregateDailyMetrics(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.WEEKLY_AGGREGATION:
        result = await aggregateWeeklyMetrics(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.MONTHLY_AGGREGATION:
        result = await aggregateMonthlyMetrics(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.COST_TRENDS:
        result = await calculateCostTrends(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.USAGE_PATTERNS:
        result = await analyzeUsagePatterns(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.PROFITABILITY_METRICS:
        result = await calculateProfitabilityMetrics(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.ORGANIZATION_METRICS:
        result = await aggregateOrganizationMetrics(organizationId, parameters);
        break;

      case ANALYTICS_TYPES.FEATURE_PERFORMANCE:
        result = await analyzeFeaturePerformance(organizationId, parameters);
        break;

      default:
        throw new Error(`Unknown analytics type: ${type}`);
    }

    // Update job progress
    if (job) {
      job.progress(90);
    }

    logger.info(`Analytics job completed: ${type}`);

    return {
      success: true,
      type,
      organizationId,
      result,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Analytics job failed: ${type}`, error.message);
    throw error;
  }
}

/**
 * Aggregate daily metrics
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function aggregateDailyMetrics(organizationId, parameters) {
  const { date = new Date() } = parameters;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const matchOrg = organizationId ? { organization: organizationId } : {};

  // Aggregate from feature usage history
  const usageAggregation = await Feature.aggregate([
    { $match: matchOrg },
    { $unwind: '$usageHistory' },
    {
      $match: {
        'usageHistory.date': { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: '$usageHistory.requests' },
        totalTokens: { $sum: '$usageHistory.tokens' },
        totalCost: { $sum: '$usageHistory.cost' },
        totalErrors: { $sum: '$usageHistory.errorCount' },
        avgLatency: { $avg: '$usageHistory.avgLatency' }
      }
    }
  ]);

  const metrics = usageAggregation[0] || {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    totalErrors: 0,
    avgLatency: 0
  };

  return {
    date: startOfDay.toISOString().split('T')[0],
    ...metrics,
    errorRate: metrics.totalRequests > 0
      ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2)
      : 0
  };
}

/**
 * Aggregate weekly metrics
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function aggregateWeeklyMetrics(organizationId, parameters) {
  const { endDate = new Date() } = parameters;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const dailyMetrics = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayMetrics = await aggregateDailyMetrics(organizationId, { date: currentDate });
    dailyMetrics.push(dayMetrics);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dailyMetrics,
    totals: {
      totalRequests: dailyMetrics.reduce((sum, d) => sum + d.totalRequests, 0),
      totalTokens: dailyMetrics.reduce((sum, d) => sum + d.totalTokens, 0),
      totalCost: dailyMetrics.reduce((sum, d) => sum + d.totalCost, 0),
      totalErrors: dailyMetrics.reduce((sum, d) => sum + d.totalErrors, 0),
      avgLatency: dailyMetrics.reduce((sum, d) => sum + parseFloat(d.avgLatency || 0), 0) / dailyMetrics.length
    }
  };
}

/**
 * Aggregate monthly metrics
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function aggregateMonthlyMetrics(organizationId, parameters) {
  const { month, year } = parameters;
  const currentDate = new Date();

  const targetMonth = month !== undefined ? month : currentDate.getMonth();
  const targetYear = year || currentDate.getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0);

  const dailyMetrics = [];
  let currentDateIter = new Date(startDate);

  while (currentDateIter <= endDate) {
    const dayMetrics = await aggregateDailyMetrics(organizationId, { date: currentDateIter });
    dailyMetrics.push(dayMetrics);
    currentDateIter.setDate(currentDateIter.getDate() + 1);
  }

  return {
    month: targetMonth + 1,
    year: targetYear,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dailyMetrics,
    totals: {
      totalRequests: dailyMetrics.reduce((sum, d) => sum + d.totalRequests, 0),
      totalTokens: dailyMetrics.reduce((sum, d) => sum + d.totalTokens, 0),
      totalCost: dailyMetrics.reduce((sum, d) => sum + d.totalCost, 0),
      totalErrors: dailyMetrics.reduce((sum, d) => sum + d.totalErrors, 0)
    },
    averages: {
      dailyRequests: dailyMetrics.reduce((sum, d) => sum + d.totalRequests, 0) / dailyMetrics.length,
      dailyCost: dailyMetrics.reduce((sum, d) => sum + d.totalCost, 0) / dailyMetrics.length
    }
  };
}

/**
 * Calculate cost trends
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function calculateCostTrends(organizationId, parameters) {
  const { days = 30 } = parameters;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchOrg = organizationId ? { organization: organizationId } : {};

  const trends = await Feature.aggregate([
    { $match: matchOrg },
    { $unwind: '$usageHistory' },
    {
      $match: {
        'usageHistory.date': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$usageHistory.date' } },
          feature: '$_id'
        },
        dailyCost: { $sum: '$usageHistory.cost' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        totalCost: { $sum: '$dailyCost' },
        features: {
          $push: {
            featureId: '$_id.feature',
            cost: '$dailyCost'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Calculate trend direction
  const costs = trends.map(t => t.totalCost);
  const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  const lastWeekAvg = costs.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, costs.length);
  const previousWeekAvg = costs.slice(-14, -7).reduce((a, b) => a + b, 0) / Math.min(7, costs.length - 7);

  const trendDirection = lastWeekAvg > previousWeekAvg ? 'increasing' :
    lastWeekAvg < previousWeekAvg ? 'decreasing' : 'stable';

  return {
    period: { days, startDate, endDate },
    trends,
    summary: {
      averageCost: avgCost,
      totalCost: costs.reduce((a, b) => a + b, 0),
      trendDirection,
      weeklyChange: previousWeekAvg > 0
        ? (((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100).toFixed(2)
        : 0
    }
  };
}

/**
 * Analyze usage patterns
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function analyzeUsagePatterns(organizationId, parameters) {
  const { days = 30 } = parameters;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchOrg = organizationId ? { organization: organizationId } : {};

  // Analyze by hour of day
  const hourlyPatterns = await Feature.aggregate([
    { $match: matchOrg },
    { $unwind: '$usageHistory' },
    {
      $match: {
        'usageHistory.date': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $hour: '$usageHistory.date' },
        totalRequests: { $sum: '$usageHistory.requests' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Analyze by day of week
  const dailyPatterns = await Feature.aggregate([
    { $match: matchOrg },
    { $unwind: '$usageHistory' },
    {
      $match: {
        'usageHistory.date': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: '$usageHistory.date' },
        totalRequests: { $sum: '$usageHistory.requests' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Find peak hours
  const peakHour = hourlyPatterns.reduce((max, h) =>
    h.totalRequests > (max?.totalRequests || 0) ? h : max, null);

  const peakDay = dailyPatterns.reduce((max, d) =>
    d.totalRequests > (max?.totalRequests || 0) ? d : max, null);

  return {
    period: { days, startDate, endDate },
    hourlyPatterns,
    dailyPatterns,
    insights: {
      peakHour: peakHour?._id || 0,
      peakDay: peakDay?._id || 1,
      peakHourRequests: peakHour?.totalRequests || 0,
      peakDayRequests: peakDay?.totalRequests || 0
    }
  };
}

/**
 * Calculate profitability metrics
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function calculateProfitabilityMetrics(organizationId, parameters) {
  const { month, year } = parameters;
  const currentDate = new Date();
  const targetMonth = month !== undefined ? month : currentDate.getMonth();
  const targetYear = year || currentDate.getFullYear();

  // Get plans for organization
  const plans = await Plan.find({ organization: organizationId, isActive: true });
  const monthlyMetrics = await aggregateMonthlyMetrics(organizationId, { month: targetMonth, year: targetYear });

  // Calculate revenue (from plans)
  const totalRevenue = plans.reduce((sum, plan) => {
    const subscribers = plan.subscribers?.length || 0;
    const price = plan.monthlyPrice || 0;
    return sum + (subscribers * price);
  }, 0);

  const totalCost = monthlyMetrics.totals.totalCost;
  const grossProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    month: targetMonth + 1,
    year: targetYear,
    revenue: {
      total: totalRevenue,
      byPlan: plans.map(p => ({
        name: p.name,
        subscribers: p.subscribers?.length || 0,
        revenue: (p.subscribers?.length || 0) * (p.monthlyPrice || 0)
      }))
    },
    costs: {
      total: totalCost,
      breakdown: monthlyMetrics.dailyMetrics
    },
    profitability: {
      grossProfit,
      margin: margin.toFixed(2),
      status: margin > 30 ? 'healthy' : margin > 10 ? 'moderate' : 'low'
    }
  };
}

/**
 * Aggregate organization metrics
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function aggregateOrganizationMetrics(organizationId, parameters) {
  if (!organizationId) {
    // Aggregate for all organizations
    const orgs = await Organization.find({ isActive: true });
    const results = [];

    for (const org of orgs) {
      const metrics = await aggregateOrganizationMetrics(org._id.toString(), parameters);
      results.push(metrics);
    }

    return {
      organizations: results,
      totals: {
        totalOrganizations: orgs.length,
        totalUsers: results.reduce((sum, r) => sum + r.users.total, 0),
        totalFeatures: results.reduce((sum, r) => sum + r.features.total, 0)
      }
    };
  }

  // Get organization details
  const org = await Organization.findById(organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }

  // Count users
  const userCount = await User.countDocuments({ organization: organizationId });

  // Count features
  const featureCount = await Feature.countDocuments({ organization: organizationId });

  // Count plans
  const planCount = await Plan.countDocuments({ organization: organizationId });

  // Count simulations
  const simulationCount = await Simulation.countDocuments({ organization: organizationId });

  // Get monthly cost
  const monthlyMetrics = await aggregateMonthlyMetrics(organizationId, {});

  return {
    organizationId,
    organizationName: org.name,
    users: {
      total: userCount,
      plan: org.subscription?.plan || 'free'
    },
    features: {
      total: featureCount,
      active: await Feature.countDocuments({ organization: organizationId, status: 'active' })
    },
    plans: {
      total: planCount,
      active: await Plan.countDocuments({ organization: organizationId, isActive: true })
    },
    simulations: {
      total: simulationCount
    },
    costs: monthlyMetrics.totals,
    subscription: {
      plan: org.subscription?.plan,
      status: org.subscription?.status
    }
  };
}

/**
 * Analyze feature performance
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Parameters
 * @returns {Promise<Object>}
 */
async function analyzeFeaturePerformance(organizationId, parameters) {
  const { days = 30 } = parameters;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const features = await Feature.find({ organization: organizationId })
    .populate('model', 'name')
    .populate('provider', 'name');

  const featureMetrics = [];

  for (const feature of features) {
    // Calculate metrics from usage history
    const relevantHistory = feature.usageHistory.filter(h =>
      new Date(h.date) >= startDate && new Date(h.date) <= endDate
    );

    const totalRequests = relevantHistory.reduce((sum, h) => sum + h.requests, 0);
    const totalCost = relevantHistory.reduce((sum, h) => sum + h.cost, 0);
    const totalErrors = relevantHistory.reduce((sum, h) => sum + h.errors, 0);
    const avgLatency = relevantHistory.length > 0
      ? relevantHistory.reduce((sum, h) => sum + h.avgLatency, 0) / relevantHistory.length
      : 0;

    featureMetrics.push({
      id: feature._id,
      name: feature.name,
      category: feature.category,
      model: feature.model?.name,
      provider: feature.provider?.name,
      status: feature.status,
      metrics: {
        totalRequests,
        totalCost,
        totalErrors,
        errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0,
        avgLatency: avgLatency.toFixed(2),
        costPerRequest: totalRequests > 0 ? (totalCost / totalRequests).toFixed(6) : 0
      }
    });
  }

  // Sort by cost
  featureMetrics.sort((a, b) => b.metrics.totalCost - a.metrics.totalCost);

  return {
    period: { days, startDate, endDate },
    features: featureMetrics,
    summary: {
      totalFeatures: features.length,
      totalCost: featureMetrics.reduce((sum, f) => sum + f.metrics.totalCost, 0),
      totalRequests: featureMetrics.reduce((sum, f) => sum + f.metrics.totalRequests, 0),
      averageErrorRate: featureMetrics.length > 0
        ? (featureMetrics.reduce((sum, f) => sum + parseFloat(f.metrics.errorRate || 0), 0) / featureMetrics.length).toFixed(2)
        : 0
    }
  };
}

/**
 * Register analytics processor with queue service
 * @param {Object} queueService - Queue service instance
 */
async function register(queueService) {
  await queueService.registerProcessor('analytics', processAnalyticsJob, 2);
  logger.info('Analytics job processor registered');
}

export default {
  process: processAnalyticsJob,
  register,
  ANALYTICS_TYPES
};