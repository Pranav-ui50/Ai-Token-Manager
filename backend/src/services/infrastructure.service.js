/**
 * Infrastructure Service
 *
 * Handles infrastructure overhead configuration and cost calculations.
 * FR-21: Infrastructure Overhead Configuration
 */

import Feature from '../models/Feature.js';
import Organization from '../models/Organization.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

// Infrastructure type multipliers for cost estimation
const INFRASTRUCTURE_MULTIPLIERS = {
  serverless: {
    baseMultiplier: 1.0,
    description: 'Pay-per-use with auto-scaling',
    recommended: ['API Gateway', 'Lambda/Functions', 'Managed Databases']
  },
  dedicated: {
    baseMultiplier: 0.7,
    description: 'Fixed monthly cost with reserved capacity',
    recommended: ['Dedicated Servers', 'Dedicated Database', 'CDN']
  },
  hybrid: {
    baseMultiplier: 0.85,
    description: 'Mix of serverless and dedicated resources',
    recommended: ['Auto-scaling Groups', 'Load Balancers', 'Mixed Storage']
  },
  shared: {
    baseMultiplier: 1.3,
    description: 'Shared infrastructure with resource contention',
    recommended: ['Shared Hosting', 'Multi-tenant Databases']
  }
};

// Default infrastructure cost templates
const DEFAULT_INFRASTRUCTURE_COSTS = {
  serverless: {
    fixedCostPerRequest: 0.00001,
    overheadPercentage: 15,
    monthlyFixedCost: 50,
    components: [
      { name: 'API Gateway', costPerRequest: 0.0000035 },
      { name: 'Lambda/Functions', costPerRequest: 0.000002 },
      { name: 'CloudWatch Logs', costPerRequest: 0.0000005 }
    ]
  },
  dedicated: {
    fixedCostPerRequest: 0.000005,
    overheadPercentage: 10,
    monthlyFixedCost: 500,
    components: [
      { name: 'Dedicated Server', monthlyCost: 300 },
      { name: 'Load Balancer', monthlyCost: 50 },
      { name: 'Database', monthlyCost: 100 }
    ]
  },
  hybrid: {
    fixedCostPerRequest: 0.000008,
    overheadPercentage: 12,
    monthlyFixedCost: 200,
    components: [
      { name: 'Auto-scaling Group', monthlyCost: 100 },
      { name: 'Managed Database', monthlyCost: 75 },
      { name: 'CDN', costPerGB: 0.02 }
    ]
  },
  shared: {
    fixedCostPerRequest: 0.000002,
    overheadPercentage: 20,
    monthlyFixedCost: 25,
    components: [
      { name: 'Shared Hosting', monthlyCost: 20 },
      { name: 'Shared Database', monthlyCost: 5 }
    ]
  }
};

class InfrastructureService {
  /**
   * Get infrastructure cost configuration for a feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Infrastructure configuration
   */
  async getInfrastructureConfig(featureId, organizationId) {
    const feature = await Feature.findOne({
      _id: featureId,
      organization: organizationId
    });

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    return {
      featureId: feature._id,
      featureName: feature.name,
      infrastructureCost: feature.infrastructureCost || this.getDefaultConfig('serverless'),
      recommendations: this.getRecommendations(feature.infrastructureCost?.infrastructureType || 'serverless')
    };
  }

  /**
   * Update infrastructure cost configuration for a feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @param {Object} config - Infrastructure configuration
   * @returns {Object} Updated feature
   */
  async updateInfrastructureConfig(featureId, organizationId, config) {
    const feature = await Feature.findOne({
      _id: featureId,
      organization: organizationId
    });

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    // Validate configuration
    const validatedConfig = this.validateConfig(config);

    // Update infrastructure cost
    feature.infrastructureCost = {
      fixedCostPerRequest: validatedConfig.fixedCostPerRequest,
      overheadPercentage: validatedConfig.overheadPercentage,
      monthlyFixedCost: validatedConfig.monthlyFixedCost,
      currency: validatedConfig.currency || 'USD',
      infrastructureType: validatedConfig.infrastructureType,
      notes: validatedConfig.notes,
      components: validatedConfig.components,
      lastUpdated: new Date()
    };

    await feature.save();

    logger.info(`Infrastructure config updated for feature: ${feature.name}`);

    return feature;
  }

  /**
   * Get infrastructure cost templates
   * @returns {Object} Templates for different infrastructure types
   */
  getInfrastructureTemplates() {
    return {
      types: Object.keys(INFRASTRUCTURE_MULTIPLIERS).map(type => ({
        type,
        ...INFRASTRUCTURE_MULTIPLIERS[type],
        defaultCosts: DEFAULT_INFRASTRUCTURE_COSTS[type]
      })),
      currencies: ['USD', 'EUR', 'GBP']
    };
  }

  /**
   * Calculate infrastructure costs for a feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Calculation options
   * @returns {Object} Detailed cost breakdown
   */
  async calculateInfrastructureCosts(featureId, organizationId, options = {}) {
    const feature = await Feature.findOne({
      _id: featureId,
      organization: organizationId
    }).populate('model');

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    const requestsPerMonth = options.requestsPerMonth || 10000;
    const avgTokensPerRequest = options.avgTokensPerRequest ||
      (feature.tokenEstimates?.inputTokensPerRequest || 0) +
      (feature.tokenEstimates?.outputTokensPerRequest || 0);

    // Get model pricing
    const modelPricing = feature.model?.pricing || {
      inputPrice: 0,
      outputPrice: 0
    };

    // Token costs
    const inputTokenCost = (feature.tokenEstimates?.inputTokensPerRequest || 0) *
                           (modelPricing.inputPrice / 1000000) * requestsPerMonth;
    const outputTokenCost = (feature.tokenEstimates?.outputTokensPerRequest || 0) *
                            (modelPricing.outputPrice / 1000000) * requestsPerMonth;
    const totalTokenCost = inputTokenCost + outputTokenCost;

    // Infrastructure costs
    const infra = feature.infrastructureCost || {};
    const overheadCost = totalTokenCost * ((infra.overheadPercentage || 0) / 100);
    const requestCost = (infra.fixedCostPerRequest || 0) * requestsPerMonth;
    const monthlyFixed = infra.monthlyFixedCost || 0;

    // Component breakdown if available
    const componentCosts = infra.components?.map(comp => {
      if (comp.costPerRequest) {
        return { ...comp, monthlyCost: comp.costPerRequest * requestsPerMonth };
      }
      if (comp.costPerGB && options.monthlyGB) {
        return { ...comp, monthlyCost: comp.costPerGB * options.monthlyGB };
      }
      return { ...comp, monthlyCost: comp.monthlyCost || 0 };
    }) || [];

    const totalMonthlyCost = totalTokenCost + overheadCost + requestCost + monthlyFixed +
      componentCosts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);

    return {
      feature: {
        id: feature._id,
        name: feature.name,
        infrastructureType: infra.infrastructureType || 'serverless'
      },
      assumptions: {
        requestsPerMonth,
        avgTokensPerRequest,
        currency: infra.currency || 'USD'
      },
      tokenCosts: {
        inputTokenCost,
        outputTokenCost,
        totalTokenCost
      },
      infrastructureCosts: {
        overheadPercentage: infra.overheadPercentage || 0,
        overheadCost,
        fixedCostPerRequest: infra.fixedCostPerRequest || 0,
        requestCost,
        monthlyFixedCost: monthlyFixed
      },
      componentCosts,
      summary: {
        totalTokenCost,
        totalInfrastructureCost: overheadCost + requestCost + monthlyFixed,
        totalMonthlyCost,
        costPerRequest: totalMonthlyCost / requestsPerMonth,
        currency: infra.currency || 'USD'
      },
      optimization: this.getOptimizationSuggestions(totalTokenCost, overheadCost, requestCost, monthlyFixed)
    };
  }

  /**
   * Bulk update infrastructure costs for multiple features
   * @param {string} organizationId - Organization ID
   * @param {Array} updates - Array of { featureId, config }
   * @returns {Object} Update results
   */
  async bulkUpdateInfrastructureConfig(organizationId, updates) {
    const results = {
      successful: [],
      failed: []
    };

    for (const update of updates) {
      try {
        const feature = await this.updateInfrastructureConfig(
          update.featureId,
          organizationId,
          update.config
        );
        results.successful.push({
          featureId: update.featureId,
          name: feature.name
        });
      } catch (error) {
        results.failed.push({
          featureId: update.featureId,
          error: error.message
        });
      }
    }

    logger.info(`Bulk infrastructure update: ${results.successful.length} successful, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Get organization-wide infrastructure summary
   * @param {string} organizationId - Organization ID
   * @returns {Object} Infrastructure summary
   */
  async getOrganizationInfrastructureSummary(organizationId) {
    const features = await Feature.find({ organization: organizationId });

    const summary = {
      byType: {},
      totalMonthlyCost: 0,
      totalFeatures: features.length,
      features: [],
      recommendations: []
    };

    for (const feature of features) {
      const infra = feature.infrastructureCost || {};
      const type = infra.infrastructureType || 'serverless';

      if (!summary.byType[type]) {
        summary.byType[type] = {
          count: 0,
          totalFixedCost: 0,
          totalMonthlyFixed: 0,
          avgOverhead: 0
        };
      }

      summary.byType[type].count++;
      summary.byType[type].totalFixedCost += infra.fixedCostPerRequest || 0;
      summary.byType[type].totalMonthlyFixed += infra.monthlyFixedCost || 0;
      summary.byType[type].avgOverhead += infra.overheadPercentage || 0;

      const estimatedMonthly = this.estimateMonthlyCost(feature);
      summary.totalMonthlyCost += estimatedMonthly;

      summary.features.push({
        id: feature._id,
        name: feature.name,
        type,
        estimatedMonthlyCost: estimatedMonthly
      });
    }

    // Calculate averages
    for (const type of Object.keys(summary.byType)) {
      const data = summary.byType[type];
      data.avgOverhead = data.avgOverhead / data.count;
    }

    // Generate recommendations
    summary.recommendations = this.generateOrgRecommendations(summary);

    return summary;
  }

  /**
   * Apply infrastructure template to feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @param {string} templateType - Template type (serverless, dedicated, hybrid, shared)
   * @param {Object} overrides - Custom overrides
   * @returns {Object} Updated feature
   */
  async applyInfrastructureTemplate(featureId, organizationId, templateType, overrides = {}) {
    if (!DEFAULT_INFRASTRUCTURE_COSTS[templateType]) {
      throw new AppError('Invalid infrastructure template type', 400, 'INVALID_TEMPLATE');
    }

    const template = DEFAULT_INFRASTRUCTURE_COSTS[templateType];
    const config = {
      ...template,
      infrastructureType: templateType,
      ...overrides
    };

    return this.updateInfrastructureConfig(featureId, organizationId, config);
  }

  /**
   * Get default configuration for infrastructure type
   * @param {string} type - Infrastructure type
   * @returns {Object} Default configuration
   */
  getDefaultConfig(type = 'serverless') {
    return {
      fixedCostPerRequest: DEFAULT_INFRASTRUCTURE_COSTS[type]?.fixedCostPerRequest || 0,
      overheadPercentage: DEFAULT_INFRASTRUCTURE_COSTS[type]?.overheadPercentage || 0,
      monthlyFixedCost: DEFAULT_INFRASTRUCTURE_COSTS[type]?.monthlyFixedCost || 0,
      currency: 'USD',
      infrastructureType: type,
      notes: INFRASTRUCTURE_MULTIPLIERS[type]?.description || ''
    };
  }

  /**
   * Validate infrastructure configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validated configuration
   */
  validateConfig(config) {
    const validated = {
      fixedCostPerRequest: Math.max(0, Number(config.fixedCostPerRequest) || 0),
      overheadPercentage: Math.min(100, Math.max(0, Number(config.overheadPercentage) || 0)),
      monthlyFixedCost: Math.max(0, Number(config.monthlyFixedCost) || 0),
      currency: ['USD', 'EUR', 'GBP'].includes(config.currency) ? config.currency : 'USD',
      infrastructureType: ['serverless', 'dedicated', 'hybrid', 'shared'].includes(config.infrastructureType)
        ? config.infrastructureType
        : 'serverless',
      notes: config.notes?.substring(0, 500) || '',
      components: Array.isArray(config.components) ? config.components.map(comp => ({
        name: comp.name?.substring(0, 100) || 'Unnamed Component',
        costPerRequest: Math.max(0, Number(comp.costPerRequest) || undefined),
        costPerGB: Math.max(0, Number(comp.costPerGB) || undefined),
        monthlyCost: Math.max(0, Number(comp.monthlyCost) || undefined)
      })).filter(c => c.costPerRequest || c.costPerGB || c.monthlyCost) : []
    };

    return validated;
  }

  /**
   * Get recommendations for infrastructure type
   * @param {string} type - Infrastructure type
   * @returns {Object} Recommendations
   */
  getRecommendations(type) {
    const multiplier = INFRASTRUCTURE_MULTIPLIERS[type] || INFRASTRUCTURE_MULTIPLIERS.serverless;
    return {
      type,
      description: multiplier.description,
      recommended: multiplier.recommended,
      baseCostMultiplier: multiplier.baseMultiplier
    };
  }

  /**
   * Get optimization suggestions
   * @param {number} tokenCost - Token costs
   * @param {number} overheadCost - Overhead costs
   * @param {number} requestCost - Request costs
   * @param {number} monthlyFixed - Monthly fixed costs
   * @returns {Array} Optimization suggestions
   */
  getOptimizationSuggestions(tokenCost, overheadCost, requestCost, monthlyFixed) {
    const suggestions = [];
    const totalCost = tokenCost + overheadCost + requestCost + monthlyFixed;

    if (overheadCost > tokenCost * 0.2) {
      suggestions.push({
        type: 'overhead',
        message: 'Infrastructure overhead exceeds 20% of token costs. Consider optimizing your API gateway and caching strategy.',
        potentialSavings: overheadCost * 0.1
      });
    }

    if (monthlyFixed > totalCost * 0.5) {
      suggestions.push({
        type: 'fixed_costs',
        message: 'Monthly fixed costs represent a significant portion. Consider serverless for variable traffic.',
        potentialSavings: monthlyFixed * 0.2
      });
    }

    if (requestCost > 0.00001 && requestCost > tokenCost * 0.1) {
      suggestions.push({
        type: 'request_costs',
        message: 'Per-request costs are high. Consider batching requests or implementing caching.',
        potentialSavings: requestCost * 0.15
      });
    }

    return suggestions;
  }

  /**
   * Estimate monthly cost for a feature
   * @param {Object} feature - Feature document
   * @returns {number} Estimated monthly cost
   */
  estimateMonthlyCost(feature) {
    const infra = feature.infrastructureCost || {};
    const monthlyRequests = feature.stats?.totalRequests
      ? feature.stats.totalRequests * 30 // Daily to monthly estimate
      : 10000; // Default estimate

    const avgTokenCost = (feature.stats?.totalCost || 0) /
      Math.max(1, feature.stats?.totalRequests || 1) * monthlyRequests;

    const infraCost = (infra.fixedCostPerRequest || 0) * monthlyRequests +
      (infra.monthlyFixedCost || 0);

    return avgTokenCost * (1 + (infra.overheadPercentage || 0) / 100) + infraCost;
  }

  /**
   * Generate organization-level recommendations
   * @param {Object} summary - Organization summary
   * @returns {Array} Recommendations
   */
  generateOrgRecommendations(summary) {
    const recommendations = [];

    // Check for mixed infrastructure types
    const types = Object.keys(summary.byType);
    if (types.length > 2) {
      recommendations.push({
        type: 'consolidation',
        message: 'Consider standardizing infrastructure types across features for easier management.',
        priority: 'low'
      });
    }

    // Check for high-cost features
    const highCostFeatures = summary.features.filter(f => f.estimatedMonthlyCost > 1000);
    if (highCostFeatures.length > 0) {
      recommendations.push({
        type: 'high_cost',
        message: `${highCostFeatures.length} features have estimated monthly costs over $1000. Consider optimization.`,
        priority: 'high',
        features: highCostFeatures.map(f => f.name)
      });
    }

    // Check for serverless optimization
    if (summary.byType.serverless?.avgOverhead > 15) {
      recommendations.push({
        type: 'serverless_overhead',
        message: 'Serverless features have high overhead percentages. Review API gateway and function configurations.',
        priority: 'medium'
      });
    }

    return recommendations;
  }
}

export default new InfrastructureService();