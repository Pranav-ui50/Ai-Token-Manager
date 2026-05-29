/**
 * Integration Controller
 *
 * Handles HTTP requests for integration endpoints.
 * FR-45: API Integrations
 * FR-47: Usage Synchronization
 */

import integrationService from '../services/integration.service.js';
import usageSyncService from '../services/usageSync.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class IntegrationController {
  /**
   * Create a new integration
   * @route POST /api/integrations
   */
  async create(req, res, next) {
    try {
      logger.info(`[IntegrationController] create called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;
      const userId = req.user.id;

      const integration = await integrationService.create({
        organizationId,
        ...req.body
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Integration created successfully',
        data: integration
      });
    } catch (error) {
      logger.error(`[IntegrationController] Create error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get integration by ID
   * @route GET /api/integrations/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const integration = await integrationService.getById(id, organizationId);

      res.status(200).json({
        success: true,
        data: integration
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all integrations for organization
   * @route GET /api/integrations
   */
  async getForOrganization(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { status, type, page, limit } = req.query;

      const result = await integrationService.getForOrganization(organizationId, {
        status,
        type,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.status(200).json({
        success: true,
        data: result.integrations,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update integration
   * @route PUT /api/integrations/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const userId = req.user.id;

      const integration = await integrationService.update(id, req.body, organizationId, userId);

      res.status(200).json({
        success: true,
        message: 'Integration updated successfully',
        data: integration
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete integration
   * @route DELETE /api/integrations/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      await integrationService.delete(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'Integration deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test integration connection
   * @route POST /api/integrations/:id/test
   */
  async testConnection(req, res, next) {
    try {
      const { id } = req.params;

      const result = await integrationService.testConnection(id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync integration data
   * @route POST /api/integrations/:id/sync
   */
  async sync(req, res, next) {
    try {
      const { id } = req.params;

      const result = await integrationService.sync(id);

      res.status(200).json({
        success: true,
        message: 'Sync completed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle integration status
   * @route PUT /api/integrations/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const organizationId = req.user.organization;

      if (!['active', 'inactive'].includes(status)) {
        throw new AppError('Invalid status. Must be "active" or "inactive"', 400, 'VALIDATION_ERROR');
      }

      const integration = await integrationService.toggleStatus(id, status, organizationId);

      res.status(200).json({
        success: true,
        message: `Integration ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
        data: integration
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FR-47: Usage Synchronization Endpoints
  // ==========================================

  /**
   * Start a manual sync
   * @route POST /api/integrations/:id/sync/start
   */
  async startSync(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const syncRecord = await usageSyncService.startSync(id, userId, 'manual');

      res.status(202).json({
        success: true,
        message: 'Sync started successfully',
        data: {
          syncId: syncRecord._id,
          status: syncRecord.status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sync status
   * @route GET /api/integrations/:id/sync/status
   */
  async getSyncStatus(req, res, next) {
    try {
      const { id } = req.params;

      const lastSync = await usageSyncService.getLastSuccessfulSync(id);

      res.status(200).json({
        success: true,
        data: {
          lastSync: lastSync ? {
            syncId: lastSync.syncId,
            status: lastSync.status,
            completedAt: lastSync.completedAt,
            duration: lastSync.duration,
            stats: lastSync.stats,
            usageSummary: lastSync.usageSummary
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sync history
   * @route GET /api/integrations/:id/sync/history
   */
  async getSyncHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit, status, startDate, endDate } = req.query;

      const result = await usageSyncService.getSyncHistory(id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        startDate,
        endDate
      });

      res.status(200).json({
        success: true,
        data: result.syncs,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a running sync
   * @route POST /api/integrations/:id/sync/:syncId/cancel
   */
  async cancelSync(req, res, next) {
    try {
      const { syncId } = req.params;

      const result = await usageSyncService.cancelSync(syncId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry a failed sync
   * @route POST /api/integrations/:id/sync/:syncId/retry
   */
  async retrySync(req, res, next) {
    try {
      const { syncId } = req.params;
      const userId = req.user.id;

      const syncRecord = await usageSyncService.retrySync(syncId, userId);

      res.status(202).json({
        success: true,
        message: 'Sync retry started',
        data: {
          syncId: syncRecord._id,
          status: syncRecord.status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sync statistics
   * @route GET /api/integrations/sync/stats
   */
  async getSyncStats(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new AppError('startDate and endDate are required', 400, 'MISSING_PARAMETERS');
      }

      const stats = await usageSyncService.getSyncStats(organizationId, startDate, endDate);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle webhook event from external provider
   * @route POST /api/integrations/:id/webhook
   */
  async handleWebhook(req, res, next) {
    try {
      const { id } = req.params;
      const signature = req.headers['x-webhook-signature'] || req.headers['stripe-signature'];

      // Process webhook event
      const result = await usageSyncService.handleWebhookEvent(id, {
        headers: req.headers,
        body: req.body,
        signature
      });

      res.status(200).json({
        success: true,
        message: 'Webhook processed',
        data: result
      });
    } catch (error) {
      logger.error(`[IntegrationController] Webhook error: ${error.message}`);
      // Return 200 even on error to prevent retries for known errors
      res.status(200).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update sync settings
   * @route PUT /api/integrations/:id/sync/settings
   */
  async updateSyncSettings(req, res, next) {
    try {
      const { id } = req.params;
      const { enabled, interval } = req.body;
      const organizationId = req.user.organization;
      const userId = req.user.id;

      const integration = await integrationService.update(id, {
        sync: {
          enabled: enabled ?? true,
          interval: interval || 3600000 // Default 1 hour
        }
      }, organizationId, userId);

      res.status(200).json({
        success: true,
        message: 'Sync settings updated successfully',
        data: integration
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new IntegrationController();