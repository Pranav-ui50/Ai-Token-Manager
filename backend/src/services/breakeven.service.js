/**
 * Break-Even Analysis Service
 *
 * Comprehensive break-even analysis, margin calculations, and profit thresholds.
 * FR-24: Break-even Analysis and Margin Calculations
 */

import Plan from '../models/Plan.js';
import Feature from '../models/Feature.js';
import Organization from '../models/Organization.js';
import pricingEngine from './pricingEngine.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class BreakEvenService {
  /**
   * Perform comprehensive break-even analysis for a plan
   * @param {string} planId - Plan ID
   * @param {Object} options - Analysis options
   * @returns {Object} Break-even analysis results
   */
  async analyzeBreakEven(planId, options = {}) {
    const plan = await Plan.findById(planId)
      .populate('features.feature', 'name category tokenEstimates infrastructureCost');

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const billing = plan.billing || {};
    const price = billing.price || 0;
    const billingCycle = billing.billingCycle || 'monthly';

    // Get cost structure
    const costStructure = await this.getPlanCostStructure(plan, options);

    // Calculate break-even points
    const breakEvenPoints = this.calculateBreakEvenPoints(price, costStructure, billingCycle);

    // Generate scenarios
    const scenarios = await this.generateScenarios(plan, costStructure, options.scenarios);

    // Calculate sensitivity analysis
    const sensitivity = this.calculateSensitivityAnalysis(price, costStructure);

    // Calculate profit thresholds
    const profitThresholds = this.calculateProfitThresholds(price, costStructure);

    return {
      plan: {
        id: plan._id,
        name: plan.name,
        tier: plan.tier,
        pricingModel: plan.pricingModel?.type || 'flat',
        price,
        billingCycle
      },
      costStructure,
      breakEven: breakEvenPoints,
      scenarios,
      sensitivity,
      profitThresholds,
      recommendations: this.generateRecommendations(breakEvenPoints, costStructure),
      currency: billing.currency || 'USD'
    };
  }

  /**
   * Get detailed cost structure for a plan
   * @param {Object} plan - Plan document
   * @param {Object} options - Options
   * @returns {Object} Cost structure
   */
  async getPlanCostStructure(plan, options = {}) {
    const features = plan.features || [];
    const costs = plan.costs || {};

    // Fixed costs
    const fixedCosts = {
      infrastructure: costs.fixedCostsPerMonth || 0,
      support: costs.supportCostsPerMonth || 0,
      overhead: costs.overheadCostsPerMonth || 0,
      total: (costs.fixedCostsPerMonth || 0) +
             (costs.supportCostsPerMonth || 0) +
             (costs.overheadCostsPerMonth || 0)
    };

    // Variable costs per user
    let variableCostPerUser = 0;
    let tokenCostPerUser = 0;
    let infrastructureCostPerUser = 0;

    const featureBreakdown = [];
    for (const featureConfig of features) {
      if (!featureConfig.enabled || !featureConfig.feature) continue;

      const feature = featureConfig.feature;
      const requestsPerUser = options.requestsPerUser || featureConfig.defaultRequests || 50;

      // Calculate token costs
      const inputTokens = (feature.tokenEstimates?.inputTokensPerRequest || 0) * requestsPerUser;
      const outputTokens = (feature.tokenEstimates?.outputTokensPerRequest || 0) * requestsPerUser;

      // Get model pricing if available
      let tokenCost = 0;
      if (feature.model) {
        try {
          const modelCost = await pricingEngine.calculateModelCost(
            feature.model._id || feature.model,
            inputTokens,
            outputTokens
          );
          tokenCost = modelCost.costs.totalCost;
        } catch (e) {
          // Use default estimate
          tokenCost = (inputTokens + outputTokens) * 0.00001; // Fallback estimate
        }
      }

      // Infrastructure costs
      const infraCosts = feature.infrastructureCost || {};
      const infraCostPerUser = (infraCosts.fixedCostPerRequest || 0) * requestsPerUser;
      const overheadCost = tokenCost * ((infraCosts.overheadPercentage || 0) / 100);

      const featureTotalCost = tokenCost + infraCostPerUser + overheadCost;

      featureBreakdown.push({
        feature: {
          id: feature._id,
          name: feature.name,
          category: feature.category
        },
        requestsPerUser,
        tokenCost,
        infrastructureCost: infraCostPerUser + overheadCost,
        totalCost: featureTotalCost
      });

      variableCostPerUser += featureTotalCost;
      tokenCostPerUser += tokenCost;
      infrastructureCostPerUser += infraCostPerUser + overheadCost;
    }

    // Payment processing fees
    const paymentFeePercent = (costs.variableCostPercentage || 2.9) / 100;
    const price = plan.billing?.price || 0;
    const paymentFeePerUser = price * paymentFeePercent;

    return {
      fixedCosts,
      variableCosts: {
        tokenCostPerUser,
        infrastructureCostPerUser,
        paymentFeePerUser,
        totalPerUser: variableCostPerUser + paymentFeePerUser,
        breakdown: featureBreakdown
      },
      margin: {
        grossMargin: price > 0 ? ((price - variableCostPerUser) / price) * 100 : 0,
        contributionMargin: price - variableCostPerUser - paymentFeePerUser
      }
    };
  }

  /**
   * Calculate break-even points
   * @param {number} price - Plan price
   * @param {Object} costStructure - Cost structure
   * @param {string} billingCycle - Billing cycle
   * @returns {Object} Break-even points
   */
  calculateBreakEvenPoints(price, costStructure, billingCycle = 'monthly') {
    const fixedCosts = costStructure.fixedCosts.total;
    const variablePerUser = costStructure.variableCosts.totalPerUser;
    const contributionMargin = price - variablePerUser;

    // Basic break-even
    let breakEvenUsers = 0;
    let breakEvenRevenue = 0;

    if (contributionMargin > 0) {
      breakEvenUsers = Math.ceil(fixedCosts / contributionMargin);
      breakEvenRevenue = breakEvenUsers * price;
    }

    // Break-even by time period
    const periods = {
      monthly: { multiplier: 1, label: 'Month' },
      quarterly: { multiplier: 3, label: 'Quarter' },
      yearly: { multiplier: 12, label: 'Year' }
    };

    const breakEvenByPeriod = {};
    for (const [period, config] of Object.entries(periods)) {
      const periodFixedCosts = fixedCosts * config.multiplier;
      breakEvenByPeriod[period] = {
        label: config.label,
        fixedCosts: periodFixedCosts,
        breakEvenUsers: contributionMargin > 0 ? Math.ceil(periodFixedCosts / contributionMargin) : Infinity,
        breakEvenRevenue: contributionMargin > 0 ? Math.ceil(periodFixedCosts / contributionMargin) * price : Infinity
      };
    }

    // Time to break-even (assuming linear growth)
    const growthRate = 0.1; // 10% monthly growth assumption
    let monthsToBreakEven = 0;
    if (breakEvenUsers > 0) {
      // Simple estimation: months to reach break-even with compound growth
      monthsToBreakEven = Math.ceil(Math.log(breakEvenUsers) / Math.log(1 + growthRate));
    }

    return {
      users: breakEvenUsers,
      revenue: breakEvenRevenue,
      months: monthsToBreakEven,
      contributionMargin,
      contributionMarginPercent: price > 0 ? (contributionMargin / price) * 100 : 0,
      byPeriod: breakEvenByPeriod,
      metrics: {
        fixedCosts,
        variableCostPerUser: variablePerUser,
        price,
        isProfitable: contributionMargin > 0
      }
    };
  }

  /**
   * Generate scenarios for different user counts
   * @param {Object} plan - Plan document
   * @param {Object} costStructure - Cost structure
   * @param {Array} scenarioUserCounts - User counts for scenarios
   * @returns {Array} Scenarios
   */
  async generateScenarios(plan, costStructure, scenarioUserCounts = null) {
    const userCounts = scenarioUserCounts || [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    const price = plan.billing?.price || 0;
    const fixedCosts = costStructure.fixedCosts.total;
    const variablePerUser = costStructure.variableCosts.totalPerUser;

    const scenarios = [];
    for (const users of userCounts) {
      const revenue = price * users;
      const variableCosts = variablePerUser * users;
      const totalCosts = fixedCosts + variableCosts;
      const profit = revenue - totalCosts;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      scenarios.push({
        users,
        revenue,
        costs: {
          fixed: fixedCosts,
          variable: variableCosts,
          total: totalCosts
        },
        profit,
        margin,
        isProfitable: profit > 0,
        breakEvenProgress: fixedCosts > 0 ? Math.min(100, (revenue / fixedCosts) * 100) : 100
      });
    }

    return scenarios;
  }

  /**
   * Calculate sensitivity analysis
   * @param {number} price - Plan price
   * @param {Object} costStructure - Cost structure
   * @returns {Object} Sensitivity analysis
   */
  calculateSensitivityAnalysis(price, costStructure) {
    const fixedCosts = costStructure.fixedCosts.total;
    const variablePerUser = costStructure.variableCosts.totalPerUser;

    // Price sensitivity
    const priceVariations = [-20, -10, -5, 0, 5, 10, 20];
    const priceSensitivity = priceVariations.map(variation => {
      const adjustedPrice = price * (1 + variation / 100);
      const contributionMargin = adjustedPrice - variablePerUser;
      const breakEvenUsers = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : Infinity;

      return {
        variation: `${variation > 0 ? '+' : ''}${variation}%`,
        price: adjustedPrice,
        contributionMargin,
        breakEvenUsers,
        marginPercent: adjustedPrice > 0 ? (contributionMargin / adjustedPrice) * 100 : 0
      };
    });

    // Cost sensitivity
    const costVariations = [-20, -10, -5, 0, 5, 10, 20];
    const costSensitivity = costVariations.map(variation => {
      const adjustedVariableCost = variablePerUser * (1 + variation / 100);
      const contributionMargin = price - adjustedVariableCost;
      const breakEvenUsers = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : Infinity;

      return {
        variation: `${variation > 0 ? '+' : ''}${variation}%`,
        variableCostPerUser: adjustedVariableCost,
        contributionMargin,
        breakEvenUsers,
        marginPercent: price > 0 ? (contributionMargin / price) * 100 : 0
      };
    });

    // Fixed cost sensitivity
    const fixedCostSensitivity = costVariations.map(variation => {
      const adjustedFixedCosts = fixedCosts * (1 + variation / 100);
      const contributionMargin = price - variablePerUser;
      const breakEvenUsers = contributionMargin > 0 ? Math.ceil(adjustedFixedCosts / contributionMargin) : Infinity;

      return {
        variation: `${variation > 0 ? '+' : ''}${variation}%`,
        fixedCosts: adjustedFixedCosts,
        contributionMargin,
        breakEvenUsers
      };
    });

    return {
      price: priceSensitivity,
      variableCost: costSensitivity,
      fixedCost: fixedCostSensitivity
    };
  }

  /**
   * Calculate profit thresholds
   * @param {number} price - Plan price
   * @param {Object} costStructure - Cost structure
   * @returns {Object} Profit thresholds
   */
  calculateProfitThresholds(price, costStructure) {
    const fixedCosts = costStructure.fixedCosts.total;
    const variablePerUser = costStructure.variableCosts.totalPerUser;
    const contributionMargin = price - variablePerUser;

    if (contributionMargin <= 0) {
      return {
        error: 'Cannot calculate profit thresholds with negative contribution margin',
        usersToProfit: {},
        recommendations: ['Reduce variable costs or increase price']
      };
    }

    // Users needed for different profit margins
    const targetMargins = [10, 20, 30, 40, 50];
    const usersToProfit = {};

    for (const marginPercent of targetMargins) {
      const targetProfitPerUser = price * (marginPercent / 100);
      const adjustedContribution = contributionMargin - targetProfitPerUser;

      if (adjustedContribution > 0) {
        const users = Math.ceil(fixedCosts / adjustedContribution);
        usersToProfit[`${marginPercent}% margin`] = {
          users,
          revenue: users * price,
          profit: users * targetProfitPerUser - fixedCosts
        };
      } else {
        usersToProfit[`${marginPercent}% margin`] = {
          users: Infinity,
          revenue: Infinity,
          profit: 0,
          note: 'Target margin not achievable at current price'
        };
      }
    }

    // Absolute profit targets
    const profitTargets = [1000, 5000, 10000, 25000, 50000, 100000];
    const usersForProfitTarget = {};

    for (const target of profitTargets) {
      const users = Math.ceil((fixedCosts + target) / contributionMargin);
      usersForProfitTarget[`$${target.toLocaleString()}`] = {
        users,
        revenue: users * price,
        profit: target
      };
    }

    return {
      usersToProfit,
      usersForProfitTarget
    };
  }

  /**
   * Generate recommendations based on analysis
   * @param {Object} breakEven - Break-even points
   * @param {Object} costStructure - Cost structure
   * @returns {Array} Recommendations
   */
  generateRecommendations(breakEven, costStructure) {
    const recommendations = [];
    const metrics = breakEven.metrics;

    // Profitability check
    if (!metrics.isProfitable) {
      recommendations.push({
        type: 'critical',
        message: 'Plan is not profitable. Variable costs exceed price.',
        suggestions: [
          'Increase plan price',
          'Reduce feature costs',
          'Optimize infrastructure',
          'Negotiate better API rates'
        ]
      });
    }

    // Break-even analysis
    if (breakEven.users > 1000) {
      recommendations.push({
        type: 'warning',
        message: `High break-even point: ${breakEven.users} users required.`,
        suggestions: [
          'Consider reducing fixed costs',
          'Increase price to improve contribution margin',
          'Focus on customer acquisition efficiency'
        ]
      });
    } else if (breakEven.users > 500) {
      recommendations.push({
        type: 'info',
        message: `Moderate break-even point: ${breakEven.users} users required.`,
        suggestions: [
          'Monitor customer acquisition costs',
          'Focus on retention to ensure long-term profitability'
        ]
      });
    } else if (breakEven.users > 0) {
      recommendations.push({
        type: 'success',
        message: `Good break-even point: ${breakEven.users} users required.`
      });
    }

    // Margin analysis
    const marginPercent = breakEven.contributionMarginPercent;
    if (marginPercent < 30) {
      recommendations.push({
        type: 'warning',
        message: `Low contribution margin: ${marginPercent.toFixed(1)}%`,
        suggestions: [
          'Target at least 30-40% contribution margin',
          'Review variable cost structure'
        ]
      });
    } else if (marginPercent >= 50) {
      recommendations.push({
        type: 'success',
        message: `Excellent contribution margin: ${marginPercent.toFixed(1)}%`
      });
    }

    // Fixed cost analysis
    const fixedCostRatio = costStructure.fixedCosts.total / (costStructure.variableCosts.totalPerUser * 100);
    if (fixedCostRatio > 1) {
      recommendations.push({
        type: 'info',
        message: 'High fixed cost ratio. Consider variable cost structures.',
        suggestions: [
          'Evaluate serverless options',
          'Consider usage-based infrastructure',
          'Review fixed cost commitments'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Compare break-even analysis across multiple plans
   * @param {Array} planIds - Array of plan IDs
   * @returns {Object} Comparison results
   */
  async compareBreakEven(planIds) {
    const comparisons = [];

    for (const planId of planIds) {
      try {
        const analysis = await this.analyzeBreakEven(planId);
        comparisons.push({
          planId,
          planName: analysis.plan.name,
          price: analysis.plan.price,
          breakEvenUsers: analysis.breakEven.users,
          contributionMargin: analysis.breakEven.contributionMargin,
          contributionMarginPercent: analysis.breakEven.contributionMarginPercent,
          fixedCosts: analysis.costStructure.fixedCosts.total,
          variableCostPerUser: analysis.costStructure.variableCosts.totalPerUser
        });
      } catch (error) {
        logger.warn(`Failed to analyze plan ${planId}: ${error.message}`);
      }
    }

    // Sort by break-even users (ascending)
    comparisons.sort((a, b) => a.breakEvenUsers - b.breakEvenUsers);

    return {
      comparisons,
      bestValue: comparisons[0] || null,
      worstValue: comparisons[comparisons.length - 1] || null,
      summary: {
        averageBreakEven: comparisons.reduce((sum, c) => sum + c.breakEvenUsers, 0) / comparisons.length,
        averageMargin: comparisons.reduce((sum, c) => sum + c.contributionMarginPercent, 0) / comparisons.length
      }
    };
  }

  /**
   * Calculate margin impact of price change
   * @param {string} planId - Plan ID
   * @param {number} newPrice - New price
   * @returns {Object} Margin impact analysis
   */
  async calculatePriceChangeImpact(planId, newPrice) {
    const analysis = await this.analyzeBreakEven(planId);
    const currentPrice = analysis.plan.price;
    const fixedCosts = analysis.costStructure.fixedCosts.total;
    const variablePerUser = analysis.costStructure.variableCosts.totalPerUser;

    const currentMargin = currentPrice - variablePerUser;
    const newMargin = newPrice - variablePerUser;

    const currentBreakEven = currentMargin > 0 ? Math.ceil(fixedCosts / currentMargin) : Infinity;
    const newBreakEven = newMargin > 0 ? Math.ceil(fixedCosts / newMargin) : Infinity;

    const priceChange = ((newPrice - currentPrice) / currentPrice) * 100;
    const marginChange = newMargin - currentMargin;
    const breakEvenChange = currentBreakEven - newBreakEven;

    return {
      plan: analysis.plan,
      current: {
        price: currentPrice,
        contributionMargin: currentMargin,
        contributionMarginPercent: currentPrice > 0 ? (currentMargin / currentPrice) * 100 : 0,
        breakEvenUsers: currentBreakEven
      },
      proposed: {
        price: newPrice,
        contributionMargin: newMargin,
        contributionMarginPercent: newPrice > 0 ? (newMargin / newPrice) * 100 : 0,
        breakEvenUsers: newBreakEven
      },
      impact: {
        priceChange: `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
        marginChange,
        breakEvenChange,
        breakEvenPercentChange: currentBreakEven > 0 ? ((breakEvenChange / currentBreakEven) * 100).toFixed(1) : 0,
        recommendation: this.getPriceChangeRecommendation(priceChange, marginChange, breakEvenChange)
      }
    };
  }

  /**
   * Get recommendation for price change
   * @param {number} priceChange - Price change percentage
   * @param {number} marginChange - Margin change
   * @param {number} breakEvenChange - Break-even user change
   * @returns {string} Recommendation
   */
  getPriceChangeRecommendation(priceChange, marginChange, breakEvenChange) {
    if (priceChange > 20) {
      return 'Large price increase may impact customer retention. Consider phasing or grandfathering existing customers.';
    }
    if (priceChange > 0 && breakEvenChange < 0) {
      return 'Price increase improves break-even point. Monitor customer acquisition metrics.';
    }
    if (priceChange < 0) {
      return 'Price reduction increases break-even point. Ensure customer growth offsets lower margins.';
    }
    return 'Price change is within acceptable range. Monitor key metrics after implementation.';
  }

  /**
   * Get organization-wide break-even summary
   * @param {string} organizationId - Organization ID
   * @returns {Object} Organization break-even summary
   */
  async getOrganizationBreakEvenSummary(organizationId) {
    const plans = await Plan.find({ organization: organizationId });

    if (!plans.length) {
      return {
        organization: organizationId,
        plans: [],
        summary: {
          totalPlans: 0,
          profitablePlans: 0,
          averageBreakEven: 0,
          averageMargin: 0
        }
      };
    }

    const planAnalyses = [];
    for (const plan of plans) {
      try {
        const analysis = await this.analyzeBreakEven(plan._id);
        planAnalyses.push({
          planId: plan._id,
          name: plan.name,
          tier: plan.tier,
          price: analysis.plan.price,
          breakEvenUsers: analysis.breakEven.users,
          margin: analysis.breakEven.contributionMarginPercent,
          isProfitable: analysis.breakEven.metrics.isProfitable
        });
      } catch (error) {
        logger.warn(`Failed to analyze plan ${plan._id}: ${error.message}`);
      }
    }

    const profitablePlans = planAnalyses.filter(p => p.isProfitable);
    const totalBreakEven = planAnalyses.reduce((sum, p) => sum + (p.breakEvenUsers === Infinity ? 0 : p.breakEvenUsers), 0);
    const totalMargin = planAnalyses.reduce((sum, p) => sum + p.margin, 0);

    return {
      organization: organizationId,
      plans: planAnalyses,
      summary: {
        totalPlans: plans.length,
        profitablePlans: profitablePlans.length,
        unprofitablePlans: plans.length - profitablePlans.length,
        averageBreakEven: planAnalyses.length > 0 ? totalBreakEven / planAnalyses.length : 0,
        averageMargin: planAnalyses.length > 0 ? totalMargin / planAnalyses.length : 0,
        bestPlan: profitablePlans.length > 0
          ? profitablePlans.reduce((best, p) => p.breakEvenUsers < best.breakEvenUsers ? p : best, profitablePlans[0])
          : null,
        highestMargin: planAnalyses.length > 0
          ? planAnalyses.reduce((best, p) => p.margin > best.margin ? p : best, planAnalyses[0])
          : null
      }
    };
  }
}

export default new BreakEvenService();