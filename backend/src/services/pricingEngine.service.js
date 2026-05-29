/**
 * Pricing Engine Service
 *
 * Core service for all pricing and cost calculations.
 * Handles token costs, feature costs, user-level operational costs,
 * subscription profitability, and multiple pricing models.
 */

import Feature from '../models/Feature.js';
import AIModel from '../models/AIModel.js';
import Plan from '../models/Plan.js';
import Organization from '../models/Organization.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class PricingEngineService {
  // ==========================================
  // FR-22: Calculate API Token Costs
  // ==========================================

  /**
   * Calculate cost for a specific model based on token usage
   * @param {string} modelId - AI Model ID
   * @param {number} inputTokens - Input tokens used
   * @param {number} outputTokens - Output tokens used
   * @param {Object} options - Additional options
   * @returns {Object} Cost breakdown
   */
  async calculateModelCost(modelId, inputTokens, outputTokens, options = {}) {
    const model = await AIModel.findById(modelId);
    if (!model) {
      throw new AppError('Model not found', 404, 'MODEL_NOT_FOUND');
    }

    return this.calculateTokenCost(model, inputTokens, outputTokens, options);
  }

  /**
   * Calculate token cost from model object
   * @param {Object} model - AI Model document
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @param {Object} options - Additional options
   * @returns {Object} Cost breakdown
   */
  calculateTokenCost(model, inputTokens, outputTokens, options = {}) {
    const pricing = model.pricing || {};
    const inputPrice = pricing.inputPrice || 0;
    const outputPrice = pricing.outputPrice || 0;
    const currency = pricing.currency || 'USD';

    // Calculate per-token cost (prices are per 1M tokens)
    const inputCost = (inputTokens / 1000000) * inputPrice;
    const outputCost = (outputTokens / 1000000) * outputPrice;
    const totalTokenCost = inputCost + outputCost;

    // Apply infrastructure overhead if specified
    let infrastructureCost = 0;
    if (options.infrastructureOverheadPercent) {
      infrastructureCost = totalTokenCost * (options.infrastructureOverheadPercent / 100);
    }

    // Apply fixed cost per request if specified
    const fixedCostPerRequest = options.fixedCostPerRequest || 0;

    const totalCost = totalTokenCost + infrastructureCost + fixedCostPerRequest;

    return {
      model: {
        id: model._id,
        name: model.displayName || model.name,
        type: model.type
      },
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      },
      pricing: {
        inputPrice,
        outputPrice,
        currency
      },
      costs: {
        inputCost,
        outputCost,
        tokenCost: totalTokenCost,
        infrastructureCost,
        fixedCost: fixedCostPerRequest,
        totalCost
      },
      currency
    };
  }

  // ==========================================
  // FR-23: Feature-level Costs
  // ==========================================

  /**
   * Calculate cost for a feature usage
   * @param {string} featureId - Feature ID
   * @param {number} requests - Number of requests
   * @param {Object} options - Additional options
   * @returns {Object} Feature cost breakdown
   */
  async calculateFeatureCost(featureId, requests, options = {}) {
    const feature = await Feature.findById(featureId)
      .populate('model', 'name displayName type pricing')
      .populate('provider', 'name slug');

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    const tokenEstimates = feature.tokenEstimates || {};
    const inputTokensPerRequest = tokenEstimates.inputTokensPerRequest || 0;
    const outputTokensPerRequest = tokenEstimates.outputTokensPerRequest || 0;
    const multiplier = tokenEstimates.dynamicMultiplier || 1;

    // Apply calculation method
    let totalInputTokens, totalOutputTokens;
    switch (tokenEstimates.calculationMethod) {
      case 'dynamic':
        totalInputTokens = inputTokensPerRequest * requests * multiplier;
        totalOutputTokens = outputTokensPerRequest * requests * multiplier;
        break;
      case 'user-based':
        const users = options.users || 1;
        totalInputTokens = inputTokensPerRequest * requests * users;
        totalOutputTokens = outputTokensPerRequest * requests * users;
        break;
      case 'fixed':
      default:
        totalInputTokens = inputTokensPerRequest * requests;
        totalOutputTokens = outputTokensPerRequest * requests;
    }

    // Calculate base token cost
    const tokenCost = this.calculateTokenCost(
      feature.model,
      totalInputTokens,
      totalOutputTokens,
      {
        infrastructureOverheadPercent: feature.infrastructureCost?.overheadPercentage,
        fixedCostPerRequest: feature.infrastructureCost?.fixedCostPerRequest
      }
    );

    // Add infrastructure monthly cost (prorated per request)
    const monthlyFixedCost = feature.infrastructureCost?.monthlyFixedCost || 0;
    const monthlyCostPerRequest = requests > 0 ? monthlyFixedCost / (requests * 30) : 0;

    const featureCost = {
      feature: {
        id: feature._id,
        name: feature.name,
        category: feature.category
      },
      model: tokenCost.model,
      provider: feature.provider,
      requests,
      tokens: tokenCost.tokens,
      costs: {
        ...tokenCost.costs,
        monthlyFixedCostProportion: monthlyCostPerRequest * requests,
        totalCost: tokenCost.costs.totalCost + (monthlyCostPerRequest * requests)
      },
      currency: tokenCost.currency,
      calculationMethod: tokenEstimates.calculationMethod || 'fixed'
    };

    return featureCost;
  }

  // ==========================================
  // FR-24: User-level Operational Costs
  // ==========================================

  /**
   * Calculate operational costs for a user
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} usageData - Usage data for the user
   * @param {Object} options - Additional options
   * @returns {Object} User-level cost breakdown
   */
  async calculateUserOperationalCosts(organizationId, userId, usageData, options = {}) {
    const {
      featureUsage = [], // Array of { featureId, requests }
      directApiUsage = [], // Array of { modelId, inputTokens, outputTokens }
      period = 'month' // billing period
    } = usageData;

    // Calculate feature-based costs
    const featureCosts = [];
    let totalFeatureCost = 0;

    for (const usage of featureUsage) {
      try {
        const cost = await this.calculateFeatureCost(usage.featureId, usage.requests, {
          users: 1,
          ...options
        });
        featureCosts.push(cost);
        totalFeatureCost += cost.costs.totalCost;
      } catch (error) {
        logger.warn(`Failed to calculate cost for feature ${usage.featureId}: ${error.message}`);
      }
    }

    // Calculate direct API costs
    const apiCosts = [];
    let totalApiCost = 0;

    for (const usage of directApiUsage) {
      try {
        const cost = await this.calculateModelCost(
          usage.modelId,
          usage.inputTokens,
          usage.outputTokens,
          options
        );
        apiCosts.push(cost);
        totalApiCost += cost.costs.totalCost;
      } catch (error) {
        logger.warn(`Failed to calculate cost for model ${usage.modelId}: ${error.message}`);
      }
    }

    // Aggregate by model
    const modelBreakdown = this.aggregateByModel([...featureCosts, ...apiCosts]);

    // Calculate period totals
    const totalCost = totalFeatureCost + totalApiCost;
    const totalTokens = featureCosts.reduce((sum, c) => sum + c.tokens.total, 0) +
                        apiCosts.reduce((sum, c) => sum + c.tokens.total, 0);
    const totalRequests = featureUsage.reduce((sum, u) => sum + u.requests, 0) +
                          directApiUsage.reduce((sum, u) => sum + 1, 0);

    return {
      user: userId,
      organization: organizationId,
      period,
      summary: {
        totalCost,
        totalTokens,
        totalRequests,
        featureCost: totalFeatureCost,
        apiCost: totalApiCost
      },
      breakdown: {
        byFeature: featureCosts,
        byApi: apiCosts,
        byModel: modelBreakdown
      },
      currency: 'USD'
    };
  }

  /**
   * Aggregate costs by model
   * @param {Array} costs - Array of cost objects
   * @returns {Object} Aggregated costs by model
   */
  aggregateByModel(costs) {
    const modelMap = {};

    for (const cost of costs) {
      const modelId = cost.model?.id || 'unknown';
      if (!modelMap[modelId]) {
        modelMap[modelId] = {
          model: cost.model,
          totalCost: 0,
          totalTokens: 0,
          totalRequests: 0,
          currency: cost.currency
        };
      }
      modelMap[modelId].totalCost += cost.costs?.totalCost || 0;
      modelMap[modelId].totalTokens += cost.tokens?.total || 0;
      modelMap[modelId].totalRequests += cost.requests || 1;
    }

    return Object.values(modelMap);
  }

  // ==========================================
  // FR-25: Subscription Profitability
  // ==========================================

  /**
   * Calculate profitability for a subscription plan
   * @param {string} planId - Plan ID
   * @param {Object} actualUsage - Actual usage data
   * @returns {Object} Profitability analysis
   */
  async calculatePlanProfitability(planId, actualUsage = null) {
    const plan = await Plan.findById(planId)
      .populate('features.feature', 'name category tokenEstimates');

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    // Get pricing model
    const pricingModel = plan.pricingModel || { type: 'flat' };
    const billing = plan.billing || {};

    // Calculate revenue
    const basePrice = billing.price || 0;
    let usageRevenue = 0;
    let creditRevenue = 0;

    // Calculate usage-based revenue
    if (pricingModel.type === 'usage-based' && actualUsage) {
      const usageBased = pricingModel.usageBased || {};
      const includedTokens = usageBased.includedTokens || 0;
      const includedRequests = usageBased.includedRequests || 0;
      const overageMultiplier = usageBased.overageMultiplier || 1;

      const tokenOverage = Math.max(0, (actualUsage.tokens || 0) - includedTokens);
      const requestOverage = Math.max(0, (actualUsage.requests || 0) - includedRequests);

      usageRevenue = (tokenOverage * (usageBased.pricePerToken || 0) * overageMultiplier) +
                     (requestOverage * (usageBased.pricePerRequest || 0) * overageMultiplier);
    }

    // Calculate credit revenue
    if (plan.credits?.creditPricing && actualUsage?.creditPurchases) {
      const creditPricing = plan.credits.creditPricing;
      for (const purchase of actualUsage.creditPurchases) {
        creditRevenue += this.calculateCreditPurchaseRevenue(plan, purchase.credits);
      }
    }

    const totalRevenue = basePrice + usageRevenue + creditRevenue;

    // Calculate costs
    const featureCosts = await this.calculatePlanFeatureCosts(plan, actualUsage);
    const infrastructureCost = plan.costs?.fixedCostsPerMonth || 0;
    const variableCost = (totalRevenue * (plan.costs?.variableCostPercentage || 2.9)) / 100;

    const totalCost = featureCosts.total + infrastructureCost + variableCost;

    // Calculate profitability
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      plan: {
        id: plan._id,
        name: plan.name,
        tier: plan.tier,
        pricingModel: pricingModel.type
      },
      revenue: {
        base: basePrice,
        usage: usageRevenue,
        credits: creditRevenue,
        total: totalRevenue
      },
      costs: {
        features: featureCosts,
        infrastructure: infrastructureCost,
        variable: variableCost,
        total: totalCost
      },
      profitability: {
        profit,
        margin,
        isProfitable: profit > 0
      },
      currency: billing.currency || 'USD'
    };
  }

  /**
   * Calculate feature costs for a plan
   * @param {Object} plan - Plan document
   * @param {Object} actualUsage - Actual usage data
   * @returns {Object} Feature costs breakdown
   */
  async calculatePlanFeatureCosts(plan, actualUsage = null) {
    const features = plan.features || [];
    const featureCosts = [];
    let totalCost = 0;

    for (const featureConfig of features) {
      if (!featureConfig.enabled || !featureConfig.feature) continue;

      const feature = featureConfig.feature;
      const limits = featureConfig.limits || {};
      const multiplier = limits.multiplier || 1;

      // Estimate requests per user if not provided
      const requestsPerUser = actualUsage?.requestsPerUser || 100;
      const users = actualUsage?.users || plan.stats?.activeSubscribers || 1;

      try {
        const cost = await this.calculateFeatureCost(
          feature._id,
          requestsPerUser * users,
          { users }
        );

        // Apply multiplier
        const adjustedCost = cost.costs.totalCost * multiplier;

        featureCosts.push({
          feature: {
            id: feature._id,
            name: feature.name,
            category: feature.category
          },
          requests: requestsPerUser * users,
          baseCost: cost.costs.totalCost,
          multiplier,
          adjustedCost,
          currency: cost.currency
        });

        totalCost += adjustedCost;
      } catch (error) {
        logger.warn(`Failed to calculate cost for feature ${feature._id}: ${error.message}`);
      }
    }

    return {
      features: featureCosts,
      total: totalCost
    };
  }

  /**
   * Calculate credit purchase revenue
   * @param {Object} plan - Plan document
   * @param {number} credits - Credits purchased
   * @returns {number} Revenue from credit purchase
   */
  calculateCreditPurchaseRevenue(plan, credits) {
    const creditPricing = plan.credits?.creditPricing || {};
    const pricePerCredit = creditPricing.pricePerCredit || 0;

    // Check for bulk discounts
    let discountPercent = 0;
    const bulkDiscounts = creditPricing.bulkDiscounts || [];
    for (const discount of bulkDiscounts) {
      if (credits >= discount.minQuantity) {
        discountPercent = Math.max(discountPercent, discount.discountPercent);
      }
    }

    const baseCost = credits * pricePerCredit;
    return baseCost * (1 - discountPercent / 100);
  }

  // ==========================================
  // FR-26: Multiple Pricing Models
  // ==========================================

  /**
   * Calculate cost based on pricing model type
   * @param {Object} plan - Plan document
   * @param {Object} usage - Usage data
   * @returns {Object} Cost calculation
   */
  calculateByPricingModel(plan, usage) {
    const pricingModel = plan.pricingModel || { type: 'flat' };
    const billing = plan.billing || {};

    switch (pricingModel.type) {
      case 'flat':
        return this.calculateFlatPricing(plan, usage);

      case 'usage-based':
        return this.calculateUsageBasedPricing(plan, usage);

      case 'tiered':
        return this.calculateTieredPricing(plan, usage);

      case 'hybrid':
        return this.calculateHybridPricing(plan, usage);

      case 'credit-based':
        return this.calculateCreditBasedPricing(plan, usage);

      default:
        return this.calculateFlatPricing(plan, usage);
    }
  }

  /**
   * Calculate flat pricing
   * @param {Object} plan - Plan document
   * @param {Object} usage - Usage data
   * @returns {Object} Cost calculation
   */
  calculateFlatPricing(plan, usage) {
    const billing = plan.billing || {};
    return {
      model: 'flat',
      basePrice: billing.price || 0,
      overageCost: 0,
      totalCost: billing.price || 0,
      currency: billing.currency || 'USD'
    };
  }

  /**
   * Calculate usage-based pricing
   * @param {Object} plan - Plan document
   * @param {Object} usage - Usage data with tokens and requests
   * @returns {Object} Cost calculation
   */
  calculateUsageBasedPricing(plan, usage) {
    const billing = plan.billing || {};
    const usageBased = plan.pricingModel?.usageBased || {};

    const basePrice = billing.price || 0;
    const includedTokens = usageBased.includedTokens || 0;
    const includedRequests = usageBased.includedRequests || 0;
    const tokensUsed = usage.tokens || 0;
    const requestsUsed = usage.requests || 0;

    // Calculate overage
    const tokenOverage = Math.max(0, tokensUsed - includedTokens);
    const requestOverage = Math.max(0, requestsUsed - includedRequests);

    const overageCost = (tokenOverage * (usageBased.pricePerToken || 0) * (usageBased.overageMultiplier || 1)) +
                        (requestOverage * (usageBased.pricePerRequest || 0) * (usageBased.overageMultiplier || 1));

    return {
      model: 'usage-based',
      basePrice,
      included: { tokens: includedTokens, requests: includedRequests },
      usage: { tokens: tokensUsed, requests: requestsUsed },
      overage: { tokens: tokenOverage, requests: requestOverage },
      overageCost,
      totalCost: basePrice + overageCost,
      currency: billing.currency || 'USD'
    };
  }

  /**
   * Calculate tiered pricing
   * @param {Object} plan - Plan document
   * @param {Object} usage - Usage data
   * @returns {Object} Cost calculation
   */
  calculateTieredPricing(plan, usage) {
    const billing = plan.billing || {};
    const tiers = plan.pricingModel?.tiers || [];
    const tokensUsed = usage.tokens || 0;

    let totalCost = 0;
    let remainingTokens = tokensUsed;
    const tierCosts = [];

    for (const tier of tiers) {
      if (remainingTokens <= 0) break;

      const tierTokens = tier.to
        ? Math.min(remainingTokens, tier.to - tier.from)
        : remainingTokens;

      const tierCost = tierTokens * tier.pricePerUnit;
      totalCost += tierCost;

      tierCosts.push({
        from: tier.from,
        to: tier.to,
        tokens: tierTokens,
        pricePerUnit: tier.pricePerUnit,
        cost: tierCost
      });

      remainingTokens -= tierTokens;
    }

    return {
      model: 'tiered',
      basePrice: billing.price || 0,
      tiers: tierCosts,
      totalTokens: tokensUsed,
      totalCost: totalCost + (billing.price || 0),
      currency: billing.currency || 'USD'
    };
  }

  /**
   * Calculate hybrid pricing (flat + usage-based)
   * @param {Object} plan - Plan document
   * @param {Object} usage - Usage data
   * @returns {Object} Cost calculation
   */
  calculateHybridPricing(plan, usage) {
    const billing = plan.billing || {};
    const flatCost = this.calculateFlatPricing(plan, usage);
    const usageCost = this.calculateUsageBasedPricing(plan, usage);

    return {
      model: 'hybrid',
      flat: flatCost,
      usage: usageCost,
      totalCost: flatCost.totalCost + usageCost.overageCost,
      currency: billing.currency || 'USD'
    };
  }

  /**
   * Calculate credit-based pricing
   * @param {Object} plan - Plan document
   * @param {Object} usage - Usage data with creditsUsed
   * @returns {Object} Cost calculation
   */
  calculateCreditBasedPricing(plan, usage) {
    const billing = plan.billing || {};
    const credits = plan.credits || {};
    const creditsUsed = usage.creditsUsed || 0;
    const includedCredits = credits.includedCredits || 0;

    // Check if usage exceeds included credits
    const overageCredits = Math.max(0, creditsUsed - includedCredits);
    const overageCost = overageCredits * (credits.creditPricing?.pricePerCredit || 0);

    return {
      model: 'credit-based',
      basePrice: billing.price || 0,
      includedCredits,
      creditsUsed,
      overageCredits,
      overageCost,
      totalCost: billing.price + overageCost,
      currency: billing.currency || 'USD'
    };
  }

  // ==========================================
  // FR-27: Margin Calculations
  // ==========================================

  /**
   * Calculate margins for multiple scenarios
   * @param {string} planId - Plan ID
   * @param {Array} scenarios - Array of usage scenarios
   * @returns {Object} Margin analysis
   */
  async calculateMarginScenarios(planId, scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      const profitability = await this.calculatePlanProfitability(planId, scenario.usage);
      results.push({
        name: scenario.name,
        usage: scenario.usage,
        revenue: profitability.revenue,
        costs: profitability.costs,
        margin: profitability.profitability.margin,
        profit: profitability.profitability.profit
      });
    }

    return {
      planId,
      scenarios: results,
      averageMargin: results.reduce((sum, r) => sum + r.margin, 0) / results.length,
      bestCase: results.reduce((best, r) => r.margin > best.margin ? r : best, results[0]),
      worstCase: results.reduce((worst, r) => r.margin < worst.margin ? r : worst, results[0])
    };
  }

  // ==========================================
  // FR-28: Break-even Analysis
  // ==========================================

  /**
   * Calculate break-even analysis
   * @param {string} planId - Plan ID
   * @param {Object} options - Analysis options
   * @returns {Object} Break-even analysis
   */
  async calculateBreakEvenAnalysis(planId, options = {}) {
    const plan = await Plan.findById(planId)
      .populate('features.feature', 'name tokenEstimates');

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    const billing = plan.billing || {};
    const price = billing.price || 0;
    const fixedCosts = plan.costs?.fixedCostsPerMonth || 0;
    const variablePercent = (plan.costs?.variableCostPercentage || 2.9) / 100;

    // Calculate cost per user
    const featureCosts = await this.calculatePlanFeatureCosts(plan, { users: 1 });
    const variableCostPerUser = featureCosts.total;
    const paymentFeePerUser = price * variablePercent;

    const totalCostPerUser = variableCostPerUser + paymentFeePerUser;
    const contributionMargin = price - totalCostPerUser;

    // Break-even users
    let breakEvenUsers = 0;
    if (contributionMargin > 0) {
      breakEvenUsers = Math.ceil(fixedCosts / contributionMargin);
    }

    // Generate scenarios for different user counts
    const scenarios = [];
    const userCounts = options.scenarios || [10, 50, 100, 500, 1000, 5000];

    for (const users of userCounts) {
      const revenue = price * users;
      const variableCost = totalCostPerUser * users;
      const totalCost = fixedCosts + variableCost;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      scenarios.push({
        users,
        revenue,
        fixedCosts,
        variableCost,
        totalCost,
        profit,
        margin
      });
    }

    return {
      plan: {
        id: plan._id,
        name: plan.name,
        price
      },
      analysis: {
        fixedCosts,
        variableCostPerUser,
        contributionMargin,
        contributionMarginPercent: price > 0 ? (contributionMargin / price) * 100 : 0,
        breakEvenUsers
      },
      scenarios,
      currency: billing.currency || 'USD',
      recommendation: this.generateBreakEvenRecommendation(breakEvenUsers, contributionMargin, price)
    };
  }

  /**
   * Generate break-even recommendation
   * @param {number} breakEvenUsers - Break-even user count
   * @param {number} contributionMargin - Contribution margin per user
   * @param {number} price - Plan price
   * @returns {string} Recommendation
   */
  generateBreakEvenRecommendation(breakEvenUsers, contributionMargin, price) {
    if (contributionMargin <= 0) {
      return 'Plan is not profitable at any scale. Review pricing and cost structure.';
    }

    if (breakEvenUsers <= 10) {
      return 'Excellent unit economics. Plan becomes profitable very quickly.';
    }

    if (breakEvenUsers <= 50) {
      return 'Good unit economics. Profitability achievable with modest user acquisition.';
    }

    if (breakEvenUsers <= 100) {
      return 'Moderate unit economics. Consider optimizing costs or adjusting pricing.';
    }

    return 'Challenging unit economics. Significant user acquisition required for profitability.';
  }

  // ==========================================
  // Real-time Cost Estimation
  // ==========================================

  /**
   * Estimate costs for a new feature
   * @param {string} organizationId - Organization ID
   * @param {Object} featureConfig - Feature configuration
   * @param {number} estimatedRequests - Estimated requests per month
   * @returns {Object} Cost estimation
   */
  async estimateFeatureCosts(organizationId, featureConfig, estimatedRequests = 1000) {
    const model = await AIModel.findById(featureConfig.modelId);
    if (!model) {
      throw new AppError('Model not found', 404, 'MODEL_NOT_FOUND');
    }

    const inputTokensPerRequest = featureConfig.inputTokensPerRequest || 0;
    const outputTokensPerRequest = featureConfig.outputTokensPerRequest || 0;

    const totalInputTokens = inputTokensPerRequest * estimatedRequests;
    const totalOutputTokens = outputTokensPerRequest * estimatedRequests;

    const cost = this.calculateTokenCost(model, totalInputTokens, totalOutputTokens, {
      infrastructureOverheadPercent: featureConfig.infrastructureOverhead,
      fixedCostPerRequest: featureConfig.fixedCostPerRequest
    });

    return {
      model: cost.model,
      estimatedRequests,
      tokens: cost.tokens,
      costs: {
        ...cost.costs,
        costPerRequest: cost.costs.totalCost / estimatedRequests,
        monthlyCost: cost.costs.totalCost
      },
      currency: cost.currency
    };
  }

  /**
   * Compare costs between models
   * @param {Array} modelIds - Array of model IDs
   * @param {Object} usage - Usage profile
   * @returns {Object} Cost comparison
   */
  async compareModelCosts(modelIds, usage) {
    const comparisons = [];

    for (const modelId of modelIds) {
      try {
        const cost = await this.calculateModelCost(
          modelId,
          usage.inputTokens,
          usage.outputTokens
        );
        comparisons.push({
          model: cost.model,
          totalCost: cost.costs.totalCost,
          tokens: cost.tokens,
          costPerToken: cost.costs.totalCost / cost.tokens.total
        });
      } catch (error) {
        logger.warn(`Failed to compare model ${modelId}: ${error.message}`);
      }
    }

    // Sort by total cost
    comparisons.sort((a, b) => a.totalCost - b.totalCost);

    return {
      usage,
      comparisons,
      cheapest: comparisons[0] || null,
      mostExpensive: comparisons[comparisons.length - 1] || null,
      savings: comparisons.length > 1
        ? comparisons[comparisons.length - 1].totalCost - comparisons[0].totalCost
        : 0
    };
  }
}

export default new PricingEngineService();