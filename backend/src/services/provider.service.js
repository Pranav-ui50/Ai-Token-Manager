/**
 * Provider Service
 *
 * Handles all AI provider-related business logic.
 */

import Provider from '../models/Provider.js';
import AIModel from '../models/AIModel.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import cacheService from './cache.service.js';

class ProviderService {
  constructor() {
    this.cacheKeys = {
      list: 'providers:list',
      byId: (id) => `provider:id:${id}`,
      bySlug: (slug) => `provider:slug:${slug}`,
      models: (id) => `provider:${id}:models`
    };
  }

  /**
   * Create a new provider
   * @param {Object} data - Provider data
   * @param {string} userId - Creator user ID
   * @returns {Object} Created provider
   */
  async create(data, userId) {
    const { name, displayName, description, logo, website, apiEndpoint, authType, authConfig, settings } = data;

    // Check if provider with same name exists
    const existingProvider = await Provider.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

    if (existingProvider) {
      throw new AppError('Provider with this name already exists', 409, 'DUPLICATE_ERROR');
    }

    const provider = await Provider.create({
      name,
      displayName,
      description,
      logo,
      website,
      apiEndpoint,
      authType,
      authConfig,
      settings,
      createdBy: userId
    });

    logger.info(`Provider created: ${provider.name} by user ${userId}`);

    // Invalidate provider list cache
    await cacheService.del(this.cacheKeys.list);

    return provider;
  }

  /**
   * Get all providers
   * @param {Object} options - Query options
   * @returns {Object} Providers with pagination
   */
  async getAll(options = {}) {
    const { page = 1, limit = 20, activeOnly = true } = options;
    const query = activeOnly ? { isActive: true } : {};

    // For first page with default limit, use cache
    if (page === 1 && limit === 20 && activeOnly) {
      const cacheKey = `${this.cacheKeys.list}:active`;
      return cacheService.getOrSet(cacheKey, async () => {
        const providers = await Provider.find(query)
          .sort({ name: 1 })
          .limit(limit)
          .populate('createdBy', 'firstName lastName email');

        const total = await Provider.countDocuments(query);

        return {
          providers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      }, 3600); // 1 hour cache
    }

    const providers = await Provider.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');

    const total = await Provider.countDocuments(query);

    return {
      providers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get provider by ID
   * @param {string} providerId - Provider ID
   * @returns {Object} Provider
   */
  async getById(providerId) {
    const cacheKey = this.cacheKeys.byId(providerId);

    return cacheService.getOrSet(cacheKey, async () => {
      const provider = await Provider.findById(providerId)
        .populate('createdBy', 'firstName lastName email');

      if (!provider) {
        throw new AppError('Provider not found', 404, 'NOT_FOUND');
      }

      return provider;
    }, 3600); // 1 hour cache
  }

  /**
   * Get provider by slug
   * @param {string} slug - Provider slug
   * @returns {Object} Provider
   */
  async getBySlug(slug) {
    const cacheKey = this.cacheKeys.bySlug(slug);

    return cacheService.getOrSet(cacheKey, async () => {
      const provider = await Provider.findBySlug(slug);

      if (!provider) {
        throw new AppError('Provider not found', 404, 'NOT_FOUND');
      }

      return provider;
    }, 3600); // 1 hour cache
  }

  /**
   * Update provider
   * @param {string} providerId - Provider ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID
   * @returns {Object} Updated provider
   */
  async update(providerId, data, userId) {
    const provider = await Provider.findById(providerId);

    if (!provider) {
      throw new AppError('Provider not found', 404, 'NOT_FOUND');
    }

    // Update allowed fields
    const allowedUpdates = [
      'displayName', 'description', 'logo', 'website',
      'apiEndpoint', 'authType', 'authConfig', 'settings', 'isActive'
    ];

    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        provider[field] = data[field];
      }
    });

    await provider.save();

    logger.info(`Provider updated: ${provider._id} by user ${userId}`);

    // Invalidate cache
    await Promise.all([
      cacheService.del(this.cacheKeys.byId(providerId)),
      cacheService.del(this.cacheKeys.bySlug(provider.slug)),
      cacheService.del(this.cacheKeys.list)
    ]);

    return provider;
  }

  /**
   * Delete provider (soft delete)
   * @param {string} providerId - Provider ID
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async delete(providerId, userId) {
    const provider = await Provider.findById(providerId);

    if (!provider) {
      throw new AppError('Provider not found', 404, 'NOT_FOUND');
    }

    // Check for active models
    const modelCount = await AIModel.countDocuments({ provider: providerId, isActive: true });

    if (modelCount > 0) {
      throw new AppError(
        `Cannot delete provider with ${modelCount} active models. Deactivate models first.`,
        400,
        'HAS_ACTIVE_MODELS'
      );
    }

    // Soft delete
    provider.isActive = false;
    await provider.save();

    logger.info(`Provider deleted: ${provider._id} by user ${userId}`);

    // Invalidate cache
    await Promise.all([
      cacheService.del(this.cacheKeys.byId(providerId)),
      cacheService.del(this.cacheKeys.bySlug(provider.slug)),
      cacheService.del(this.cacheKeys.list)
    ]);

    return { message: 'Provider deleted successfully' };
  }

  /**
   * Get provider models
   * @param {string} providerId - Provider ID
   * @param {Object} options - Query options
   * @returns {Array} Models
   */
  async getModels(providerId, options = {}) {
    const { activeOnly = true, type } = options;

    // Cache key based on options
    const cacheKey = `${this.cacheKeys.models(providerId)}:${activeOnly ? 'active' : 'all'}:${type || 'all'}`;

    return cacheService.getOrSet(cacheKey, async () => {
      const query = { provider: providerId };
      if (activeOnly) query.isActive = true;
      if (type) query.type = type;

      const models = await AIModel.find(query)
        .sort({ name: 1 })
        .populate('deprecated.replacementModel', 'name displayName');

      return models;
    }, 1800); // 30 min cache
  }
}

export default new ProviderService();