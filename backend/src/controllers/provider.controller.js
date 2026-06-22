/**
 * Provider Controller
 *
 * HTTP handlers for AI provider endpoints.
 */

import providerService from '../services/provider.service.js';
import dynamicModelsService from '../services/dynamicModels.service.js';
import auditService from '../services/audit.service.js';
import eventService from '../services/event.service.js';

class ProviderController {
  /**
   * Create a new provider
   */
  async create(req, res, next) {
    try {
      const provider = await providerService.create(req.body, req.user.id);

      // Log provider creation
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: 'provider_created',
        resourceType: 'provider',
        resourceId: provider._id,
        resourceName: provider.displayName || provider.name,
        description: `Provider "${provider.displayName || provider.name}" created`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      // Emit event for webhook triggers
      await eventService.emit(req.user.organization, 'provider.created', {
        provider: {
          id: provider._id,
          name: provider.name,
          displayName: provider.displayName
        },
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        data: provider
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all providers
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, activeOnly } = req.query;
      const result = await providerService.getAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        activeOnly: activeOnly !== 'false'
      });

      res.json({
        success: true,
        data: result.providers,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by ID
   */
  async getById(req, res, next) {
    try {
      const provider = await providerService.getById(req.params.id);

      res.json({
        success: true,
        data: provider
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider by slug
   */
  async getBySlug(req, res, next) {
    try {
      const provider = await providerService.getBySlug(req.params.slug);

      res.json({
        success: true,
        data: provider
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update provider
   */
  async update(req, res, next) {
    try {
      // Get previous state for comparison
      const previousProvider = await providerService.getById(req.params.id);

      const provider = await providerService.update(
        req.params.id,
        req.body,
        req.user.id
      );

      // Log provider update
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: 'provider_updated',
        resourceType: 'provider',
        resourceId: provider._id,
        resourceName: provider.displayName || provider.name,
        description: `Provider "${provider.displayName || provider.name}" updated`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      // Emit event for webhook triggers
      await eventService.emit(req.user.organization, 'provider.updated', {
        provider: {
          id: provider._id,
          name: provider.name,
          displayName: provider.displayName,
          isActive: provider.isActive
        },
        changes: req.body,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: provider
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete provider
   */
  async delete(req, res, next) {
    try {
      await providerService.delete(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Provider deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider models
   */
  async getModels(req, res, next) {
    try {
      const { type, activeOnly } = req.query;
      const models = await providerService.getModels(req.params.id, {
        type,
        activeOnly: activeOnly !== 'false'
      });

      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dynamic models from provider API
   * Fetches models directly from provider's API if supported,
   * falls back to database models otherwise
   */
  async getDynamicModels(req, res, next) {
    try {
      const { id } = req.params;
      const { forceRefresh, mergePricing } = req.query;

      // Get organization ID for credential lookup
      const organizationId = req.user.organization || req.user.currentOrganization;

      // Get dynamic models
      const result = await dynamicModelsService.getModels(id, {
        forceRefresh: forceRefresh === 'true',
        useCache: forceRefresh !== 'true'
      }, organizationId);

      // Optionally merge with database pricing
      if (mergePricing !== 'false' && result.source !== 'database') {
        const dbModels = await providerService.getModels(id, { activeOnly: true });
        result.models = dynamicModelsService.mergeWithDatabasePricing(result.models, dbModels);
      }

      res.json({
        success: true,
        data: result.models,
        meta: {
          provider: result.provider,
          source: result.source,
          fromCache: result.fromCache,
          count: result.models.length,
          reason: result.reason
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supported providers for dynamic model discovery
   */
  async getSupportedProviders(req, res, next) {
    try {
      const providers = dynamicModelsService.getSupportedProviders();

      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear dynamic models cache for a provider
   */
  async clearModelsCache(req, res, next) {
    try {
      await dynamicModelsService.clearCache(req.params.id);

      res.json({
        success: true,
        message: 'Models cache cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle provider status (activate/deactivate)
   */
  async toggleStatus(req, res, next) {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: { message: 'isActive must be a boolean value' }
        });
      }

      const provider = await providerService.toggleStatus(
        req.params.id,
        isActive,
        req.user.id
      );

      // Log status change
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: isActive ? 'provider_activated' : 'provider_deactivated',
        resourceType: 'provider',
        resourceId: provider._id,
        resourceName: provider.displayName || provider.name,
        description: `Provider "${provider.displayName || provider.name}" ${isActive ? 'activated' : 'deactivated'}`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        data: provider,
        message: `Provider ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider status with health check
   */
  async getStatus(req, res, next) {
    try {
      const status = await providerService.getProviderStatus(req.params.id);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test provider API connectivity
   */
  async testConnectivity(req, res, next) {
    try {
      const result = await providerService.testConnectivity(req.params.id);

      // Log connectivity test
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: 'provider_connectivity_test',
        resourceType: 'provider',
        resourceId: req.params.id,
        description: `Connectivity test for provider: ${result.isHealthy ? 'passed' : 'failed'}`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        },
        metadata: {
          overallStatus: result.overallStatus,
          testsCount: result.tests.length
        }
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all provider statuses (summary)
   */
  async getAllStatuses(req, res, next) {
    try {
      const statuses = await providerService.getAllProviderStatuses();

      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProviderController();