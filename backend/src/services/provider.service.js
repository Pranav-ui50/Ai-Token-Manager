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

  /**
   * Toggle provider status (activate/deactivate)
   * @param {string} providerId - Provider ID
   * @param {boolean} isActive - New status
   * @param {string} userId - User ID
   * @returns {Object} Updated provider
   */
  async toggleStatus(providerId, isActive, userId) {
    const provider = await Provider.findById(providerId);

    if (!provider) {
      throw new AppError('Provider not found', 404, 'NOT_FOUND');
    }

    // Check if trying to deactivate a provider with active models
    if (isActive === false) {
      const activeModelCount = await AIModel.countDocuments({
        provider: providerId,
        isActive: true
      });

      if (activeModelCount > 0) {
        throw new AppError(
          `Cannot deactivate provider with ${activeModelCount} active models. Deactivate models first.`,
          400,
          'HAS_ACTIVE_MODELS'
        );
      }
    }

    provider.isActive = isActive;
    await provider.save();

    logger.info(`Provider ${providerId} ${isActive ? 'activated' : 'deactivated'} by user ${userId}`);

    // Invalidate cache
    await Promise.all([
      cacheService.del(this.cacheKeys.byId(providerId)),
      cacheService.del(this.cacheKeys.bySlug(provider.slug)),
      cacheService.del(this.cacheKeys.list)
    ]);

    return provider;
  }

  /**
   * Get provider status with health check
   * @param {string} providerId - Provider ID
   * @returns {Object} Provider status
   */
  async getProviderStatus(providerId) {
    const provider = await Provider.findById(providerId);

    if (!provider) {
      throw new AppError('Provider not found', 404, 'NOT_FOUND');
    }

    // Get model statistics
    const totalModels = await AIModel.countDocuments({ provider: providerId });
    const activeModels = await AIModel.countDocuments({ provider: providerId, isActive: true });
    const deprecatedModels = await AIModel.countDocuments({
      provider: providerId,
      'deprecated.isDeprecated': true
    });

    // Get pricing update statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const PricingHistory = (await import('../models/PricingHistory.js')).default;
    const recentPricingUpdates = await PricingHistory.countDocuments({
      provider: providerId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Determine health status
    let healthStatus = 'healthy';
    let healthIssues = [];

    if (!provider.isActive) {
      healthStatus = 'inactive';
      healthIssues.push('Provider is inactive');
    } else if (activeModels === 0 && totalModels > 0) {
      healthStatus = 'warning';
      healthIssues.push('No active models available');
    }

    if (deprecatedModels > 0 && deprecatedModels === activeModels) {
      healthStatus = 'warning';
      healthIssues.push('All active models are deprecated');
    }

    return {
      provider: {
        id: provider._id,
        name: provider.name,
        displayName: provider.displayName,
        isActive: provider.isActive
      },
      status: {
        health: healthStatus,
        issues: healthIssues,
        lastChecked: new Date()
      },
      statistics: {
        totalModels,
        activeModels,
        deprecatedModels,
        recentPricingUpdates
      },
      configuration: {
        apiEndpoint: provider.apiEndpoint,
        authType: provider.authType,
        supportsStreaming: provider.settings?.supportsStreaming || false,
        supportsVision: provider.settings?.supportsVision || false,
        supportsFunctionCalling: provider.settings?.supportsFunctionCalling || false
      }
    };
  }

  /**
   * Test provider API connectivity
   * @param {string} providerId - Provider ID
   * @returns {Object} Connectivity test result
   */
  async testConnectivity(providerId) {
    const provider = await Provider.findById(providerId);

    if (!provider) {
      throw new AppError('Provider not found', 404, 'NOT_FOUND');
    }

    const result = {
      provider: {
        id: provider._id,
        name: provider.name,
        displayName: provider.displayName
      },
      timestamp: new Date(),
      tests: []
    };

    // Test 1: API endpoint configuration
    const hasApiEndpoint = !!provider.apiEndpoint;
    result.tests.push({
      name: 'API Endpoint Configuration',
      status: hasApiEndpoint ? 'pass' : 'warning',
      message: hasApiEndpoint
        ? `Endpoint configured: ${provider.apiEndpoint}`
        : 'No API endpoint configured'
    });

    // Test 2: Authentication configuration
    const hasAuthConfig = provider.authType && provider.authConfig;
    result.tests.push({
      name: 'Authentication Configuration',
      status: hasAuthConfig ? 'pass' : 'warning',
      message: hasAuthConfig
        ? `Auth type: ${provider.authType}`
        : 'No authentication configured'
    });

    // Test 3: Active models available
    const activeModels = await AIModel.countDocuments({
      provider: providerId,
      isActive: true
    });
    result.tests.push({
      name: 'Active Models',
      status: activeModels > 0 ? 'pass' : 'warning',
      message: `${activeModels} active model(s) available`
    });

    // Test 4: Provider is active
    result.tests.push({
      name: 'Provider Status',
      status: provider.isActive ? 'pass' : 'fail',
      message: provider.isActive
        ? 'Provider is active'
        : 'Provider is inactive'
    });

    // Calculate overall status
    const hasFail = result.tests.some(t => t.status === 'fail');
    const hasWarning = result.tests.some(t => t.status === 'warning');
    result.overallStatus = hasFail ? 'fail' : hasWarning ? 'warning' : 'pass';
    result.isHealthy = !hasFail;

    return result;
  }

  /**
   * Get all provider statuses
   * @returns {Array} All provider statuses
   */
  async getAllProviderStatuses() {
    const providers = await Provider.find({}).sort({ name: 1 });

    const statuses = await Promise.all(
      providers.map(async (provider) => {
        const activeModels = await AIModel.countDocuments({
          provider: provider._id,
          isActive: true
        });

        return {
          id: provider._id,
          name: provider.name,
          displayName: provider.displayName,
          isActive: provider.isActive,
          activeModels,
          hasApiEndpoint: !!provider.apiEndpoint
        };
      })
    );

    return statuses;
  }
}

export default new ProviderService();