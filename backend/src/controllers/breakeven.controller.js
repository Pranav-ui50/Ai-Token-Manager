/**
 * Break-Even Analysis Controller
 *
 * HTTP handlers for break-even analysis endpoints.
 */

import breakevenService from '../services/breakeven.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class BreakEvenController {
  /**
   * Get break-even analysis for a plan
   * GET /api/plans/:planId/breakeven
   */
  async getBreakEvenAnalysis(req, res, next) {
    try {
      const { planId } = req.params;
      const options = {
        scenarios: req.query.scenarios?.split(',').map(Number).filter(n => !isNaN(n)),
        requestsPerUser: req.query.requestsPerUser ? parseInt(req.query.requestsPerUser) : undefined
      };

      const analysis = await breakevenService.analyzeBreakEven(planId, options);

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error(`[BreakEvenController] getBreakEvenAnalysis error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Compare break-even analysis across plans
   * POST /api/breakeven/compare
   */
  async comparePlans(req, res, next) {
    try {
      const { planIds } = req.body;

      if (!Array.isArray(planIds) || planIds.length === 0) {
        throw new AppError('Plan IDs array is required', 400, 'PLAN_IDS_REQUIRED');
      }

      const comparison = await breakevenService.compareBreakEven(planIds);

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      logger.error(`[BreakEvenController] comparePlans error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Calculate price change impact
   * POST /api/plans/:planId/breakeven/price-impact
   */
  async calculatePriceImpact(req, res, next) {
    try {
      const { planId } = req.params;
      const { newPrice } = req.body;

      if (newPrice === undefined || newPrice === null) {
        throw new AppError('New price is required', 400, 'NEW_PRICE_REQUIRED');
      }

      const impact = await breakevenService.calculatePriceChangeImpact(planId, Number(newPrice));

      res.status(200).json({
        success: true,
        data: impact
      });
    } catch (error) {
      logger.error(`[BreakEvenController] calculatePriceImpact error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get organization break-even summary
   * GET /api/organizations/:organizationId/breakeven/summary
   */
  async getOrganizationSummary(req, res, next) {
    try {
      const { organizationId } = req.params;

      const summary = await breakevenService.getOrganizationBreakEvenSummary(organizationId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error(`[BreakEvenController] getOrganizationSummary error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get margin scenarios for a plan
   * GET /api/plans/:planId/breakeven/scenarios
   */
  async getMarginScenarios(req, res, next) {
    try {
      const { planId } = req.params;
      const scenarios = req.query.scenarios?.split(',').map(Number).filter(n => !isNaN(n)) ||
        [10, 25, 50, 100, 250, 500, 1000];

      const analysis = await breakevenService.analyzeBreakEven(planId, { scenarios });

      res.status(200).json({
        success: true,
        data: {
          plan: analysis.plan,
          scenarios: analysis.scenarios,
          costStructure: analysis.costStructure
        }
      });
    } catch (error) {
      logger.error(`[BreakEvenController] getMarginScenarios error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get sensitivity analysis for a plan
   * GET /api/plans/:planId/breakeven/sensitivity
   */
  async getSensitivityAnalysis(req, res, next) {
    try {
      const { planId } = req.params;

      const analysis = await breakevenService.analyzeBreakEven(planId);

      res.status(200).json({
        success: true,
        data: {
          plan: analysis.plan,
          sensitivity: analysis.sensitivity,
          current: {
            price: analysis.plan.price,
            fixedCosts: analysis.costStructure.fixedCosts.total,
            variableCostPerUser: analysis.costStructure.variableCosts.totalPerUser
          }
        }
      });
    } catch (error) {
      logger.error(`[BreakEvenController] getSensitivityAnalysis error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get profit thresholds for a plan
   * GET /api/plans/:planId/breakeven/thresholds
   */
  async getProfitThresholds(req, res, next) {
    try {
      const { planId } = req.params;

      const analysis = await breakevenService.analyzeBreakEven(planId);

      res.status(200).json({
        success: true,
        data: {
          plan: analysis.plan,
          thresholds: analysis.profitThresholds,
          breakEven: analysis.breakEven
        }
      });
    } catch (error) {
      logger.error(`[BreakEvenController] getProfitThresholds error: ${error.message}`);
      next(error);
    }
  }
}

export default new BreakEvenController();