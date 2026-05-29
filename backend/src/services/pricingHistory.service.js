/**
 * Pricing History Service
 *
 * Handles pricing history tracking and retrieval.
 */

import PricingHistory from '../models/PricingHistory.js';
import AIModel from '../models/AIModel.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class PricingHistoryService {
  /**
   * Record a pricing change
   * @param {Object} data - Pricing change data
   * @returns {Object} Created pricing history
   */
  async recordPricingChange(data) {
    const {
      modelId,
      providerId,
      previousPricing,
      newPricing,
      changedBy,
      reason = 'provider_update',
      notes = '',
      source = 'official'
    } = data;

    const history = await PricingHistory.recordChange({
      modelId,
      providerId,
      previousPricing,
      newPricing,
      changedBy,
      reason,
      notes,
      source
    });

    logger.info(`Pricing history recorded for model ${modelId} by user ${changedBy}`);

    return history;
  }

  /**
   * Get pricing history for a model
   * @param {string} modelId - Model ID
   * @param {Object} options - Query options
   * @returns {Object} Pricing history with pagination
   */
  async getHistoryForModel(modelId, options = {}) {
    const { limit = 20, skip = 0 } = options;

    // Verify model exists
    const model = await AIModel.findById(modelId);
    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    const history = await PricingHistory.getHistoryForModel(modelId, { limit, skip });
    const total = await PricingHistory.countDocuments({ model: modelId });

    return {
      history,
      pagination: {
        limit,
        skip,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get pricing history for a provider
   * @param {string} providerId - Provider ID
   * @param {Object} options - Query options
   * @returns {Object} Pricing history with pagination
   */
  async getHistoryForProvider(providerId, options = {}) {
    const { limit = 20, skip = 0 } = options;

    const history = await PricingHistory.getHistoryForProvider(providerId, { limit, skip });
    const total = await PricingHistory.countDocuments({ provider: providerId });

    return {
      history,
      pagination: {
        limit,
        skip,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get recent pricing changes
   * @param {Object} options - Query options
   * @returns {Array} Recent changes
   */
  async getRecentChanges(options = {}) {
    const { days = 7, limit = 50 } = options;

    return await PricingHistory.getRecentChanges({ days, limit });
  }

  /**
   * Get price trends for a model
   * @param {string} modelId - Model ID
   * @param {number} days - Number of days to analyze
   * @returns {Array} Price trends
   */
  async getPriceTrends(modelId, days = 30) {
    // Verify model exists
    const model = await AIModel.findById(modelId);
    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    return await PricingHistory.getPriceTrends(modelId, days);
  }

  /**
   * Verify a pricing change
   * @param {string} historyId - History entry ID
   * @param {string} userId - Verifier user ID
   * @returns {Object} Updated history entry
   */
  async verifyPricingChange(historyId, userId) {
    const history = await PricingHistory.findById(historyId);

    if (!history) {
      throw new AppError('Pricing history not found', 404, 'NOT_FOUND');
    }

    await history.verify(userId);

    logger.info(`Pricing history ${historyId} verified by user ${userId}`);

    return history;
  }

  /**
   * Get price comparison between models
   * @param {Array} modelIds - Array of model IDs
   * @returns {Object} Price comparison
   */
  async comparePrices(modelIds) {
    const models = await AIModel.find({ _id: { $in: modelIds } })
      .populate('provider', 'name displayName');

    if (models.length === 0) {
      throw new AppError('No models found', 404, 'NOT_FOUND');
    }

    // Get latest pricing history for each model
    const historyPromises = modelIds.map(async (modelId) => {
      const latest = await PricingHistory.findOne({ model: modelId })
        .sort({ createdAt: -1 });
      return { modelId, history: latest };
    });

    const histories = await Promise.all(historyPromises);

    const comparison = models.map(model => {
      const historyEntry = histories.find(h => h.modelId === model._id.toString());
      return {
        model: {
          id: model._id,
          name: model.name,
          displayName: model.displayName,
          type: model.type,
          provider: model.provider
        },
        currentPricing: model.pricing,
        previousPricing: historyEntry?.history?.previousPricing || null,
        lastChanged: historyEntry?.history?.createdAt || null,
        changePercent: historyEntry?.history?.priceChange || null
      };
    });

    return comparison;
  }

  /**
   * Get pricing statistics
   * @param {string} providerId - Optional provider filter
   * @returns {Object} Pricing statistics
   */
  async getPricingStatistics(providerId = null) {
    const matchStage = providerId
      ? { $match: { provider: providerId } }
      : { $match: {} };

    const stats = await PricingHistory.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalChanges: { $sum: 1 },
          avgInputChange: { $avg: '$priceChange.inputPriceChangePercent' },
          avgOutputChange: { $avg: '$priceChange.outputPriceChangePercent' },
          maxInputIncrease: { $max: '$priceChange.inputPriceChangePercent' },
          maxInputDecrease: { $min: '$priceChange.inputPriceChangePercent' },
          maxOutputIncrease: { $max: '$priceChange.outputPriceChangePercent' },
          maxOutputDecrease: { $min: '$priceChange.outputPriceChangePercent' },
          recentChanges: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalChanges: 0,
      avgInputChange: 0,
      avgOutputChange: 0,
      maxInputIncrease: 0,
      maxInputDecrease: 0,
      maxOutputIncrease: 0,
      maxOutputDecrease: 0,
      recentChanges: 0
    };
  }
}

export default new PricingHistoryService();