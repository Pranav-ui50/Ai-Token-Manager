/**
 * Pricing Engine Controller
 *
 * Handles pricing engine HTTP requests.
 */

import pricingEngineService from '../services/pricingEngine.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class PricingEngineController {
  // ==========================================
  // FR-22: Calculate API Token Costs
  // ==========================================

  /**
   * Calculate model cost
   * @route POST /api/pricing-engine/calculate/model/:modelId
   */
  async calculateModelCost(req, res, next) {
    try {
      const { modelId } = req.params;
      const { inputTokens, outputTokens, infrastructureOverhead, fixedCostPerRequest } = req.body;

      if (!inputTokens || !outputTokens) {
        throw new AppError('Input tokens and output tokens are required', 400, 'VALIDATION_ERROR');
      }

      const result = await pricingEngineService.calculateModelCost(
        modelId,
        inputTokens,
        outputTokens,
        { infrastructureOverheadPercent: infrastructureOverhead, fixedCostPerRequest }
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate cost for multiple models
   * @route POST /api/pricing-engine/calculate/models
   */
  async calculateMultiModelCost(req, res, next) {
    try {
      const { models, inputTokens, outputTokens } = req.body;

      if (!models || !Array.isArray(models) || models.length === 0) {
        throw new AppError('Models array is required', 400, 'VALIDATION_ERROR');
      }

      const results = [];
      for (const modelId of models) {
        try {
          const result = await pricingEngineService.calculateModelCost(
            modelId,
            inputTokens,
            outputTokens
          );
          results.push(result);
        } catch (error) {
          results.push({
            modelId,
            error: error.message
          });
        }
      }

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-23: Feature-level Costs
  // ==========================================

  /**
   * Calculate feature cost
   * @route POST /api/pricing-engine/calculate/feature/:featureId
   */
  async calculateFeatureCost(req, res, next) {
    try {
      const { featureId } = req.params;
      const { requests, users } = req.body;

      const result = await pricingEngineService.calculateFeatureCost(
        featureId,
        requests || 1,
        { users: users || 1 }
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-24: User-level Operational Costs
  // ==========================================

  /**
   * Calculate user operational costs
   * @route POST /api/pricing-engine/calculate/user/:userId
   */
  async calculateUserCosts(req, res, next) {
    try {
      const { userId } = req.params;
      const organizationId = req.user.organization;
      const { featureUsage, directApiUsage, period } = req.body;

      const result = await pricingEngineService.calculateUserOperationalCosts(
        organizationId,
        userId,
        { featureUsage, directApiUsage, period: period || 'month' }
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aggregate costs by model
   * @route POST /api/pricing-engine/aggregate/model
   */
  async aggregateCostsByModel(req, res, next) {
    try {
      const { costs } = req.body;

      if (!costs || !Array.isArray(costs)) {
        throw new AppError('Costs array is required', 400, 'VALIDATION_ERROR');
      }

      const result = pricingEngineService.aggregateByModel(costs);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-25: Subscription Profitability
  // ==========================================

  /**
   * Calculate plan profitability
   * @route POST /api/pricing-engine/calculate/plan/:planId/profitability
   */
  async calculatePlanProfitability(req, res, next) {
    try {
      const { planId } = req.params;
      const { actualUsage } = req.body;

      const result = await pricingEngineService.calculatePlanProfitability(planId, actualUsage);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-26: Multiple Pricing Models
  // ==========================================

  /**
   * Calculate cost by pricing model
   * @route POST /api/pricing-engine/calculate/pricing-model/:planId
   */
  async calculateByPricingModel(req, res, next) {
    try {
      const { planId } = req.params;
      const { usage } = req.body;

      const Plan = (await import('../models/Plan.js')).default;
      const plan = await Plan.findById(planId);

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      const result = pricingEngineService.calculateByPricingModel(plan, usage || {});

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate flat pricing
   * @route POST /api/pricing-engine/calculate/flat/:planId
   */
  async calculateFlatPricing(req, res, next) {
    try {
      const { planId } = req.params;

      const Plan = (await import('../models/Plan.js')).default;
      const plan = await Plan.findById(planId);

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      const result = pricingEngineService.calculateFlatPricing(plan, req.body.usage || {});

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate usage-based pricing
   * @route POST /api/pricing-engine/calculate/usage-based/:planId
   */
  async calculateUsageBasedPricing(req, res, next) {
    try {
      const { planId } = req.params;
      const { usage } = req.body;

      const Plan = (await import('../models/Plan.js')).default;
      const plan = await Plan.findById(planId);

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      const result = pricingEngineService.calculateUsageBasedPricing(plan, usage || {});

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate tiered pricing
   * @route POST /api/pricing-engine/calculate/tiered/:planId
   */
  async calculateTieredPricing(req, res, next) {
    try {
      const { planId } = req.params;
      const { usage } = req.body;

      const Plan = (await import('../models/Plan.js')).default;
      const plan = await Plan.findById(planId);

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      const result = pricingEngineService.calculateTieredPricing(plan, usage || {});

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate credit-based pricing
   * @route POST /api/pricing-engine/calculate/credit/:planId
   */
  async calculateCreditBasedPricing(req, res, next) {
    try {
      const { planId } = req.params;
      const { creditsUsed } = req.body;

      const Plan = (await import('../models/Plan.js')).default;
      const plan = await Plan.findById(planId);

      if (!plan) {
        throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
      }

      const result = pricingEngineService.calculateCreditBasedPricing(plan, { creditsUsed: creditsUsed || 0 });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-27: Margin Calculations
  // ==========================================

  /**
   * Calculate margin scenarios
   * @route POST /api/pricing-engine/calculate/margins/:planId
   */
  async calculateMarginScenarios(req, res, next) {
    try {
      const { planId } = req.params;
      const { scenarios } = req.body;

      const result = await pricingEngineService.calculateMarginScenarios(planId, scenarios || []);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-28: Break-even Analysis
  // ==========================================

  /**
   * Calculate break-even analysis
   * @route GET /api/pricing-engine/analysis/break-even/:planId
   */
  async calculateBreakEvenAnalysis(req, res, next) {
    try {
      const { planId } = req.params;
      const { scenarios } = req.query;

      const options = {};
      if (scenarios) {
        options.scenarios = JSON.parse(scenarios);
      }

      const result = await pricingEngineService.calculateBreakEvenAnalysis(planId, options);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Real-time Cost Estimation
  // ==========================================

  /**
   * Estimate feature costs
   * @route POST /api/pricing-engine/estimate/feature
   */
  async estimateFeatureCosts(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { modelId, inputTokensPerRequest, outputTokensPerRequest, estimatedRequests, infrastructureOverhead, fixedCostPerRequest } = req.body;

      const result = await pricingEngineService.estimateFeatureCosts(
        organizationId,
        { modelId, inputTokensPerRequest, outputTokensPerRequest, infrastructureOverhead, fixedCostPerRequest },
        estimatedRequests || 1000
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare model costs
   * @route POST /api/pricing-engine/compare/models
   */
  async compareModelCosts(req, res, next) {
    try {
      const { modelIds, inputTokens, outputTokens } = req.body;

      if (!modelIds || !Array.isArray(modelIds) || modelIds.length < 2) {
        throw new AppError('At least 2 model IDs are required', 400, 'VALIDATION_ERROR');
      }

      const result = await pricingEngineService.compareModelCosts(modelIds, { inputTokens, outputTokens });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick cost calculation
   * @route POST /api/pricing-engine/quick-calculate
   */
  async quickCalculate(req, res, next) {
    try {
      const { modelId, featureId, inputTokens, outputTokens, requests } = req.body;

      let result;

      if (featureId) {
        result = await pricingEngineService.calculateFeatureCost(
          featureId,
          requests || 1,
          { users: 1 }
        );
      } else if (modelId) {
        result = await pricingEngineService.calculateModelCost(
          modelId,
          inputTokens || 0,
          outputTokens || 0
        );
      } else {
        throw new AppError('Either modelId or featureId is required', 400, 'VALIDATION_ERROR');
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PricingEngineController();