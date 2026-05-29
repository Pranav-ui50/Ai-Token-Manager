/**
 * Webhook Controller
 *
 * Handles HTTP requests for webhook endpoints.
 * FR-46: Webhook Configurations
 */

import webhookService from '../services/webhook.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class WebhookController {
  /**
   * Create a new webhook
   * @route POST /api/webhooks
   */
  async create(req, res, next) {
    try {
      logger.info(`[WebhookController] create called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;
      const userId = req.user.id;

      const result = await webhookService.create({
        organizationId,
        ...req.body
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Webhook created successfully. Save the secret key now - it will not be shown again.',
        data: result
      });
    } catch (error) {
      logger.error(`[WebhookController] Create error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get webhook by ID
   * @route GET /api/webhooks/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const webhook = await webhookService.getById(id, organizationId);

      res.status(200).json({
        success: true,
        data: webhook
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all webhooks for organization
   * @route GET /api/webhooks
   */
  async getForOrganization(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { status, event, page, limit } = req.query;

      const result = await webhookService.getForOrganization(organizationId, {
        status,
        event,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.status(200).json({
        success: true,
        data: result.webhooks,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update webhook
   * @route PUT /api/webhooks/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const userId = req.user.id;

      const webhook = await webhookService.update(id, req.body, organizationId, userId);

      res.status(200).json({
        success: true,
        message: 'Webhook updated successfully',
        data: webhook
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete webhook
   * @route DELETE /api/webhooks/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      await webhookService.delete(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test webhook
   * @route POST /api/webhooks/:id/test
   */
  async test(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const result = await webhookService.test(id, organizationId);

      res.status(200).json({
        success: result.success,
        message: result.message,
        data: {
          statusCode: result.statusCode,
          duration: result.duration
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle webhook status
   * @route PUT /api/webhooks/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const organizationId = req.user.organization;

      if (!['active', 'inactive', 'disabled'].includes(status)) {
        throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
      }

      const webhook = await webhookService.toggleStatus(id, status, organizationId);

      res.status(200).json({
        success: true,
        message: `Webhook ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'disabled'} successfully`,
        data: webhook
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate webhook secret
   * @route POST /api/webhooks/:id/regenerate-secret
   */
  async regenerateSecret(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const result = await webhookService.regenerateSecret(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'Webhook secret regenerated successfully. Save the new secret now - it will not be shown again.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get webhook delivery history
   * @route GET /api/webhooks/:id/history
   */
  async getDeliveryHistory(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const history = await webhookService.getDeliveryHistory(id, organizationId);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available webhook events
   * @route GET /api/webhooks/events
   */
  async getAvailableEvents(req, res, next) {
    try {
      const events = [
        { category: 'Provider', events: ['provider.created', 'provider.updated', 'provider.deleted'] },
        { category: 'Model', events: ['model.created', 'model.updated', 'model.deleted'] },
        { category: 'Feature', events: ['feature.created', 'feature.updated', 'feature.deleted'] },
        { category: 'Plan', events: ['plan.created', 'plan.updated', 'plan.deleted'] },
        { category: 'Project', events: ['project.created', 'project.updated', 'project.deleted'] },
        { category: 'Pricing', events: ['pricing.changed', 'pricing.alert'] },
        { category: 'Simulation', events: ['simulation.started', 'simulation.completed', 'simulation.failed'] },
        { category: 'Analytics', events: ['analytics.threshold_reached', 'analytics.cost_spike'] },
        { category: 'Integration', events: ['integration.connected', 'integration.disconnected', 'integration.error'] },
        { category: 'User', events: ['user.registered', 'user.invited'] },
        { category: 'Organization', events: ['organization.created', 'organization.updated'] }
      ];

      res.status(200).json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new WebhookController();