/**
 * Pricing History Controller
 *
 * Handles pricing history HTTP requests.
 */

import pricingHistoryService from '../services/pricingHistory.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class PricingHistoryController {
  /**
   * Get pricing history for a model
   * @route GET /api/pricing-history/model/:modelId
   */
  async getByModel(req, res, next) {
    try {
      const { modelId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      const result = await pricingHistoryService.getHistoryForModel(modelId, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pricing history for a provider
   * @route GET /api/pricing-history/provider/:providerId
   */
  async getByProvider(req, res, next) {
    try {
      const { providerId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      const result = await pricingHistoryService.getHistoryForProvider(providerId, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent pricing changes
   * @route GET /api/pricing-history/recent
   */
  async getRecentChanges(req, res, next) {
    try {
      const { days = 7, limit = 50 } = req.query;

      const changes = await pricingHistoryService.getRecentChanges({
        days: parseInt(days),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        count: changes.length,
        data: changes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get price trends for a model
   * @route GET /api/pricing-history/trends/:modelId
   */
  async getTrends(req, res, next) {
    try {
      const { modelId } = req.params;
      const { days = 30 } = req.query;

      const trends = await pricingHistoryService.getPriceTrends(modelId, parseInt(days));

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify a pricing change
   * @route PUT /api/pricing-history/:id/verify
   */
  async verify(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const history = await pricingHistoryService.verifyPricingChange(id, userId);

      res.status(200).json({
        success: true,
        message: 'Pricing change verified successfully',
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare prices between models
   * @route POST /api/pricing-history/compare
   */
  async comparePrices(req, res, next) {
    try {
      const { modelIds } = req.body;

      if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
        throw new AppError('Model IDs array is required', 400, 'VALIDATION_ERROR');
      }

      const comparison = await pricingHistoryService.comparePrices(modelIds);

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pricing statistics
   * @route GET /api/pricing-history/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const { providerId } = req.query;

      const stats = await pricingHistoryService.getPricingStatistics(providerId || null);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PricingHistoryController();