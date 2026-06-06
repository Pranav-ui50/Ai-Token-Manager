/**
 * Feature Service
 *
 * Handles all feature-related business logic.
 */

import Feature from '../models/Feature.js';
import AIModel from '../models/AIModel.js';
import Provider from '../models/Provider.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class FeatureService {
  /**
   * Create a new feature
   * @param {Object} featureData - Feature data
   * @returns {Object} Created feature
   */
  async createFeature(featureData) {
    const { organization, name, model, provider, modelIdentifier, modelDisplayName, modelCapabilities } = featureData;

    // Determine if this is a database model or dynamic model
    const isDatabaseModel = model && /^[0-9a-fA-F]{24}$/.test(model);

    // Verify model exists if it's a database model reference
    let modelDoc = null;
    if (isDatabaseModel) {
      modelDoc = await AIModel.findById(model);
      if (!modelDoc) {
        throw new AppError('AI Model not found', 404, 'MODEL_NOT_FOUND');
      }
    }

    // Verify provider exists if provided
    if (provider) {
      const providerDoc = await Provider.findById(provider);
      if (!providerDoc) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }
    }

    // Check if feature with same name exists in organization
    const existingFeature = await Feature.findOne({ organization, name });
    if (existingFeature) {
      throw new AppError('Feature with this name already exists', 409, 'DUPLICATE_FEATURE');
    }

    // Prepare feature data
    const featurePayload = {
      ...featureData,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };

    // Handle model reference
    if (isDatabaseModel && modelDoc) {
      // Use database model reference
      featurePayload.model = model;
      featurePayload.modelIdentifier = modelDoc.name;
      featurePayload.modelDisplayName = modelDoc.displayName || modelDoc.name;
      featurePayload.modelCapabilities = modelDoc.capabilities;
    } else if (modelIdentifier) {
      // Dynamic model from API - no database reference
      featurePayload.model = null;
      featurePayload.modelIdentifier = modelIdentifier;
      featurePayload.modelDisplayName = modelDisplayName || modelIdentifier;
      if (modelCapabilities) {
        featurePayload.modelCapabilities = modelCapabilities;
      }
    }

    // Create feature
    const feature = await Feature.create(featurePayload);

    // Populate references
    await feature.populate('model', 'name displayName type pricing capabilities');
    await feature.populate('provider', 'name displayName slug');
    await feature.populate('project', 'name slug');

    logger.info(`Feature created: ${feature.name} for organization: ${organization}`);

    return feature;
  }

  /**
   * Get all features for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Features with pagination
   */
  async getFeatures(organizationId, filters = {}) {
    const { page = 1, limit = 10, status, category, search, project } = filters;

    const query = { organization: organizationId };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (project) {
      query.project = project;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const features = await Feature.find(query)
      .populate('model', 'name displayName type pricing')
      .populate('provider', 'name displayName slug')
      .populate('project', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feature.countDocuments(query);

    return {
      features,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get feature by ID
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Feature
   */
  async getFeature(featureId, organizationId) {
    // Build query - only filter by organization if provided
    const query = { _id: featureId };
    if (organizationId) {
      query.organization = organizationId;
    }

    const feature = await Feature.findOne(query)
      .populate('model', 'name displayName type pricing capabilities')
      .populate('provider', 'name displayName slug')
      .populate('project', 'name slug');

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    return feature;
  }

  /**
   * Update feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated feature
   */
  async updateFeature(featureId, organizationId, updateData) {
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.organization;
    delete updateData.slug;
    delete updateData.stats;

    // If updating model, verify it exists
    if (updateData.model) {
      const modelDoc = await AIModel.findById(updateData.model);
      if (!modelDoc) {
        throw new AppError('AI Model not found', 404, 'MODEL_NOT_FOUND');
      }
    }

    // If updating provider, verify it exists
    if (updateData.provider) {
      const providerDoc = await Provider.findById(updateData.provider);
      if (!providerDoc) {
        throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
      }
    }

    const feature = await Feature.findOneAndUpdate(
      { _id: featureId, organization: organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('model', 'name displayName type pricing')
      .populate('provider', 'name displayName slug')
      .populate('project', 'name slug');

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    logger.info(`Feature updated: ${feature.name}`);

    return feature;
  }

  /**
   * Delete feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @returns {boolean} Success
   */
  async deleteFeature(featureId, organizationId) {
    const feature = await Feature.findOneAndDelete({
      _id: featureId,
      organization: organizationId
    });

    if (!feature) {
      throw new AppError('Feature not found', 404, 'FEATURE_NOT_FOUND');
    }

    logger.info(`Feature deleted: ${feature.name}`);

    return true;
  }

  /**
   * Bulk update feature status
   * @param {Array} featureIds - Feature IDs
   * @param {string} organizationId - Organization ID
   * @param {string} status - New status
   * @returns {Object} Update result
   */
  async bulkUpdateStatus(featureIds, organizationId, status) {
    const result = await Feature.updateMany(
      { _id: { $in: featureIds }, organization: organizationId },
      { $set: { status } }
    );

    logger.info(`Bulk updated ${result.modifiedCount} features to status: ${status}`);

    return {
      modified: result.modifiedCount,
      matched: result.matchedCount
    };
  }

  /**
   * Get feature statistics
   * @param {string} organizationId - Organization ID
   * @returns {Object} Statistics
   */
  async getFeatureStats(organizationId) {
    const stats = await Feature.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: null,
          totalFeatures: { $sum: 1 },
          activeFeatures: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalRequests: { $sum: '$stats.totalRequests' },
          totalTokens: { $sum: '$stats.totalTokens' },
          totalCost: { $sum: '$stats.totalCost' },
          byCategory: {
            $push: '$category'
          }
        }
      }
    ]);

    // Count by category
    const categoryStats = await Feature.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = stats[0] || {
      totalFeatures: 0,
      activeFeatures: 0,
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0
    };

    result.categories = categoryStats.reduce((acc, cat) => {
      acc[cat._id] = cat.count;
      return acc;
    }, {});

    return result;
  }

  /**
   * Get features by category
   * @param {string} organizationId - Organization ID
   * @param {string} category - Category
   * @returns {Array} Features
   */
  async getFeaturesByCategory(organizationId, category) {
    return Feature.find({
      organization: organizationId,
      category,
      status: 'active',
      'settings.enabled': true
    })
      .populate('model', 'name displayName type pricing')
      .populate('provider', 'name displayName slug')
      .populate('project', 'name slug')
      .sort({ name: 1 });
  }

  /**
   * Calculate estimated costs for a feature
   * @param {string} featureId - Feature ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Calculation options
   * @returns {Object} Cost estimates
   */
  async calculateCostEstimate(featureId, organizationId, options = {}) {
    const feature = await this.getFeature(featureId, organizationId);

    const requestsPerMonth = options.requestsPerMonth || 1000;
    const usersPerMonth = options.usersPerMonth || 100;

    // Get model pricing
    const model = feature.model;
    if (!model || !model.pricing) {
      throw new AppError('Model pricing not available', 400, 'PRICING_NOT_AVAILABLE');
    }

    // Calculate token costs
    const inputCostPerToken = model.pricing.inputPrice / 1000000 || 0; // Convert per 1M tokens to per token
    const outputCostPerToken = model.pricing.outputPrice / 1000000 || 0;

    const inputCost = (feature.tokenEstimates.inputTokensPerRequest || 0) *
                       requestsPerMonth *
                       inputCostPerToken;

    const outputCost = (feature.tokenEstimates.outputTokensPerRequest || 0) *
                        requestsPerMonth *
                        outputCostPerToken;

    // Calculate infrastructure costs (FR-21)
    const tokenCost = inputCost + outputCost;
    const overheadPercentage = feature.infrastructureCost?.overheadPercentage || 0;
    const overheadCost = tokenCost * (overheadPercentage / 100);
    const fixedCostPerRequest = (feature.infrastructureCost?.fixedCostPerRequest || 0) * requestsPerMonth;
    const monthlyFixedCost = feature.infrastructureCost?.monthlyFixedCost || 0;

    const totalCost = tokenCost + overheadCost + fixedCostPerRequest + monthlyFixedCost;
    const costPerUser = totalCost / usersPerMonth;

    // Calculate total tokens
    const totalInputTokens = (feature.tokenEstimates.inputTokensPerRequest || 0) * requestsPerMonth;
    const totalOutputTokens = (feature.tokenEstimates.outputTokensPerRequest || 0) * requestsPerMonth;
    const totalTokens = totalInputTokens + totalOutputTokens;

    return {
      tokenCost,
      inputCost,
      outputCost,
      infrastructureCost: overheadCost + fixedCostPerRequest + monthlyFixedCost,
      totalCost,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      costPerUser,
      requestsPerMonth,
      usersPerMonth,
      currency: feature.infrastructureCost?.currency || 'USD'
    };
  }
}

export default new FeatureService();