/**
 * Model Controller
 *
 * HTTP handlers for AI model endpoints.
 */

import modelService from '../services/model.service.js';
import auditService from '../services/audit.service.js';
import eventService from '../services/event.service.js';

class ModelController {
  /**
   * Create a new model
   */
  async create(req, res, next) {
    try {
      const model = await modelService.create(req.body, req.user.id);

      // Log model creation
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: 'model_created',
        resourceType: 'model',
        resourceId: model._id,
        resourceName: model.displayName || model.name,
        description: `AI model "${model.displayName || model.name}" created`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      // Emit event for webhook triggers
      await eventService.emit(req.user.organization, 'model.created', {
        model: {
          id: model._id,
          name: model.name,
          displayName: model.displayName,
          provider: model.provider,
          pricing: model.pricing
        },
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        data: model
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all models
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, providerId, type, activeOnly } = req.query;

      console.log('[ModelController] getAll called with:', { page, limit, providerId, type, activeOnly });

      const result = await modelService.getAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        providerId,
        type,
        activeOnly: activeOnly !== 'false'
      });

      console.log('[ModelController] Found models:', result.models.length, 'for providerId:', providerId);

      res.json({
        success: true,
        data: result.models,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get model by ID
   */
  async getById(req, res, next) {
    try {
      const model = await modelService.getById(req.params.id);

      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get model by slug
   */
  async getBySlug(req, res, next) {
    try {
      const model = await modelService.getBySlug(req.params.slug);

      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update model
   */
  async update(req, res, next) {
    try {
      // Get previous state for comparison
      const previousModel = await modelService.getById(req.params.id);

      const model = await modelService.update(
        req.params.id,
        req.body,
        req.user.id
      );

      // Check if pricing was updated
      const pricingUpdated = req.body.pricing &&
        (req.body.pricing.inputPrice !== undefined || req.body.pricing.outputPrice !== undefined);

      // Log model update
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: pricingUpdated ? 'pricing_updated' : 'model_updated',
        resourceType: 'model',
        resourceId: model._id,
        resourceName: model.displayName || model.name,
        description: pricingUpdated
          ? `Pricing updated for model "${model.displayName || model.name}"`
          : `AI model "${model.displayName || model.name}" updated`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      // Emit pricing change event if pricing was updated
      if (pricingUpdated && previousModel) {
        const oldPricing = previousModel.pricing || { inputPrice: 0, outputPrice: 0 };
        const newPricing = req.body.pricing;

        // Check if prices actually changed
        const inputChanged = oldPricing.inputPrice !== newPricing.inputPrice;
        const outputChanged = oldPricing.outputPrice !== newPricing.outputPrice;

        if (inputChanged || outputChanged) {
          await eventService.emitModelPricingChanged(
            req.user.organization,
            model,
            oldPricing,
            newPricing
          );
        }
      }

      // Emit general model update event
      await eventService.emit(req.user.organization, 'model.updated', {
        model: {
          id: model._id,
          name: model.name,
          displayName: model.displayName,
          provider: model.provider
        },
        changes: req.body,
        pricingUpdated,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete model
   */
  async delete(req, res, next) {
    try {
      const model = await modelService.getById(req.params.id);
      await modelService.delete(req.params.id, req.user.id);

      // Log model deletion
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: 'delete',
        resourceType: 'model',
        resourceId: req.params.id,
        resourceName: model?.displayName || model?.name,
        description: `AI model "${model?.displayName || model?.name}" deleted`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        message: 'Model deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate cost
   */
  async calculateCost(req, res, next) {
    try {
      const { inputTokens, outputTokens } = req.body;
      const result = await modelService.calculateCost(
        req.params.id,
        inputTokens,
        outputTokens || 0
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update pricing
   */
  async bulkUpdatePricing(req, res, next) {
    try {
      const { updates } = req.body;
      const result = await modelService.bulkUpdatePricing(updates, req.user.id);

      // Log bulk pricing update
      await auditService.logSuccess({
        organization: req.user.organization,
        user: req.user.id,
        action: 'pricing_updated',
        resourceType: 'model',
        description: `Bulk pricing update for ${updates.length} models`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        },
        metadata: { updateCount: updates.length }
      });

      // Emit pricing change event for bulk updates
      await eventService.emit(req.user.organization, 'model.pricing.bulk_updated', {
        updateCount: updates.length,
        updates: updates.map(u => ({
          modelId: u.modelId,
          oldPricing: u.oldPricing,
          newPricing: u.newPricing
        })),
        timestamp: new Date().toISOString()
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
   * Get models by provider
   */
  async getByProvider(req, res, next) {
    try {
      const { type, activeOnly } = req.query;
      console.log('[ModelController] getByProvider called with id:', req.params.id);

      const models = await modelService.getByProvider(req.params.id, {
        type,
        activeOnly: activeOnly !== 'false'
      });

      console.log('[ModelController] getByProvider returning:', models.length, 'models');

      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ModelController();