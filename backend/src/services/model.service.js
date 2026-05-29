/**
 * Model Service
 *
 * Handles all AI model-related business logic.
 */

import AIModel from '../models/AIModel.js';
import Provider from '../models/Provider.js';
import PricingHistory from '../models/PricingHistory.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class ModelService {
  /**
   * Create a new model
   * @param {Object} data - Model data
   * @param {string} userId - Creator user ID
   * @returns {Object} Created model
   */
  async create(data, userId) {
    const {
      providerId, name, displayName, description, type,
      capabilities, pricing, defaults, metadata
    } = data;

    // Verify provider exists
    const provider = await Provider.findById(providerId);

    if (!provider) {
      throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
    }

    // Check if model with same name exists for provider
    const existingModel = await AIModel.findOne({
      provider: providerId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingModel) {
      throw new AppError('Model with this name already exists for this provider', 409, 'DUPLICATE_ERROR');
    }

    const model = await AIModel.create({
      provider: providerId,
      name,
      displayName,
      description,
      type,
      capabilities,
      pricing,
      defaults,
      metadata,
      createdBy: userId
    });

    await model.populate('provider', 'name displayName slug');

    logger.info(`Model created: ${model.name} for provider ${provider.name} by user ${userId}`);

    return model;
  }

  /**
   * Get all models
   * @param {Object} options - Query options
   * @returns {Object} Models with pagination
   */
  async getAll(options = {}) {
    const { page = 1, limit = 20, providerId, type, activeOnly = true } = options;

    const query = {};
    if (activeOnly) query.isActive = true;
    if (providerId) query.provider = providerId;
    if (type) query.type = type;

    const models = await AIModel.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('provider', 'name displayName slug logo')
      .populate('deprecated.replacementModel', 'name displayName');

    const total = await AIModel.countDocuments(query);

    return {
      models,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get model by ID
   * @param {string} modelId - Model ID
   * @returns {Object} Model
   */
  async getById(modelId) {
    const model = await AIModel.findById(modelId)
      .populate('provider', 'name displayName slug logo website')
      .populate('deprecated.replacementModel', 'name displayName');

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    return model;
  }

  /**
   * Get model by slug
   * @param {string} slug - Model slug
   * @returns {Object} Model
   */
  async getBySlug(slug) {
    const model = await AIModel.findBySlug(slug);

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    return model;
  }

  /**
   * Update model
   * @param {string} modelId - Model ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID
   * @returns {Object} Updated model
   */
  async update(modelId, data, userId) {
    const model = await AIModel.findById(modelId);

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    // Check if pricing is being updated - record history
    if (data.pricing && (
      data.pricing.inputPrice !== model.pricing.inputPrice ||
      data.pricing.outputPrice !== model.pricing.outputPrice ||
      data.pricing.unit !== model.pricing.unit ||
      data.pricing.pricePerUnit !== model.pricing.pricePerUnit
    )) {
      // Record pricing history
      const previousPricing = {
        inputPrice: model.pricing.inputPrice,
        outputPrice: model.pricing.outputPrice,
        currency: model.pricing.currency,
        unit: model.pricing.unit,
        pricePerUnit: model.pricing.pricePerUnit
      };

      const newPricing = {
        inputPrice: data.pricing.inputPrice ?? model.pricing.inputPrice,
        outputPrice: data.pricing.outputPrice ?? model.pricing.outputPrice,
        currency: data.pricing.currency ?? model.pricing.currency,
        unit: data.pricing.unit ?? model.pricing.unit,
        pricePerUnit: data.pricing.pricePerUnit ?? model.pricing.pricePerUnit
      };

      await PricingHistory.recordChange({
        modelId: model._id,
        providerId: model.provider,
        previousPricing,
        newPricing,
        changedBy: userId,
        reason: data.pricingChangeReason || 'manual_adjustment',
        notes: data.pricingChangeNotes || '',
        source: 'official'
      });

      logger.info(`Pricing history recorded for model ${model._id}: input ${previousPricing.inputPrice} -> ${newPricing.inputPrice}`);
    }

    // Update allowed fields
    const allowedUpdates = [
      'displayName', 'description', 'type', 'capabilities',
      'pricing', 'defaults', 'metadata', 'isActive', 'deprecated'
    ];

    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        model[field] = data[field];
      }
    });

    await model.save();
    await model.populate('provider', 'name displayName slug logo');
    await model.populate('deprecated.replacementModel', 'name displayName');

    logger.info(`Model updated: ${model._id} by user ${userId}`);

    return model;
  }

  /**
   * Delete model (soft delete)
   * @param {string} modelId - Model ID
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async delete(modelId, userId) {
    const model = await AIModel.findById(modelId);

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    // Soft delete
    model.isActive = false;
    await model.save();

    logger.info(`Model deleted: ${model._id} by user ${userId}`);

    return { message: 'Model deleted successfully' };
  }

  /**
   * Calculate cost for model usage
   * @param {string} modelId - Model ID
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @returns {Object} Cost calculation
   */
  async calculateCost(modelId, inputTokens, outputTokens = 0) {
    const model = await AIModel.findById(modelId);

    if (!model) {
      throw new AppError('Model not found', 404, 'NOT_FOUND');
    }

    const cost = model.calculateCost(inputTokens, outputTokens);

    return {
      modelId,
      modelName: model.name,
      inputTokens,
      outputTokens,
      totalCost: cost,
      currency: model.pricing.currency,
      breakdown: {
        inputCost: (inputTokens / model.pricing.pricePerUnit) * model.pricing.inputPrice,
        outputCost: (outputTokens / model.pricing.pricePerUnit) * model.pricing.outputPrice
      }
    };
  }

  /**
   * Get models by provider
   * @param {string} providerId - Provider ID
   * @param {Object} options - Query options
   * @returns {Array} Models
   */
  async getByProvider(providerId, options = {}) {
    const { type, activeOnly = true } = options;

    const query = { provider: providerId };
    if (activeOnly) query.isActive = true;
    if (type) query.type = type;

    const models = await AIModel.find(query)
      .sort({ name: 1 })
      .populate('deprecated.replacementModel', 'name displayName');

    return models;
  }

  /**
   * Bulk update pricing
   * @param {Array} updates - Array of { modelId, pricing } objects
   * @param {string} userId - User ID
   * @param {string} reason - Reason for pricing update
   * @returns {Object} Update results
   */
  async bulkUpdatePricing(updates, userId, reason = 'provider_update') {
    const results = [];

    for (const update of updates) {
      try {
        const model = await AIModel.findById(update.modelId);

        if (!model) {
          results.push({ modelId: update.modelId, success: false, error: 'Model not found' });
          continue;
        }

        // Record pricing history before updating
        const previousPricing = {
          inputPrice: model.pricing.inputPrice,
          outputPrice: model.pricing.outputPrice,
          currency: model.pricing.currency,
          unit: model.pricing.unit,
          pricePerUnit: model.pricing.pricePerUnit
        };

        const newPricing = {
          inputPrice: update.pricing.inputPrice ?? model.pricing.inputPrice,
          outputPrice: update.pricing.outputPrice ?? model.pricing.outputPrice,
          currency: update.pricing.currency ?? model.pricing.currency,
          unit: update.pricing.unit ?? model.pricing.unit,
          pricePerUnit: update.pricing.pricePerUnit ?? model.pricing.pricePerUnit
        };

        // Only record if prices changed
        if (
          previousPricing.inputPrice !== newPricing.inputPrice ||
          previousPricing.outputPrice !== newPricing.outputPrice
        ) {
          await PricingHistory.recordChange({
            modelId: model._id,
            providerId: model.provider,
            previousPricing,
            newPricing,
            changedBy: userId,
            reason,
            source: 'official'
          });
        }

        model.pricing = { ...model.pricing, ...update.pricing };
        await model.save();

        results.push({ modelId: update.modelId, success: true });
      } catch (error) {
        results.push({ modelId: update.modelId, success: false, error: error.message });
      }
    }

    logger.info(`Bulk pricing update by user ${userId}: ${results.filter(r => r.success).length} succeeded`);

    return {
      total: updates.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

export default new ModelService();