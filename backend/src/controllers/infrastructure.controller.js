/**
 * Infrastructure Controller
 *
 * HTTP handlers for infrastructure overhead configuration.
 */

import infrastructureService from '../services/infrastructure.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class InfrastructureController {
  /**
   * Get infrastructure configuration for a feature
   * GET /api/features/:featureId/infrastructure
   */
  async getConfig(req, res, next) {
    try {
      const { featureId } = req.params;
      const organizationId = req.user.organizationId || req.body.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400, 'ORGANIZATION_REQUIRED');
      }

      const config = await infrastructureService.getInfrastructureConfig(featureId, organizationId);

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error(`[InfrastructureController] getConfig error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update infrastructure configuration for a feature
   * PUT /api/features/:featureId/infrastructure
   */
  async updateConfig(req, res, next) {
    try {
      const { featureId } = req.params;
      const organizationId = req.user.organizationId || req.body.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400, 'ORGANIZATION_REQUIRED');
      }

      const config = req.body;
      const updatedFeature = await infrastructureService.updateInfrastructureConfig(
        featureId,
        organizationId,
        config
      );

      res.status(200).json({
        success: true,
        message: 'Infrastructure configuration updated successfully',
        data: {
          featureId: updatedFeature._id,
          name: updatedFeature.name,
          infrastructureCost: updatedFeature.infrastructureCost
        }
      });
    } catch (error) {
      logger.error(`[InfrastructureController] updateConfig error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get infrastructure templates
   * GET /api/infrastructure/templates
   */
  async getTemplates(req, res, next) {
    try {
      const templates = infrastructureService.getInfrastructureTemplates();

      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error(`[InfrastructureController] getTemplates error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Calculate infrastructure costs for a feature
   * POST /api/features/:featureId/infrastructure/calculate
   */
  async calculateCosts(req, res, next) {
    try {
      const { featureId } = req.params;
      const organizationId = req.user.organizationId || req.body.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400, 'ORGANIZATION_REQUIRED');
      }

      const options = {
        requestsPerMonth: req.body.requestsPerMonth,
        avgTokensPerRequest: req.body.avgTokensPerRequest,
        monthlyGB: req.body.monthlyGB
      };

      const calculation = await infrastructureService.calculateInfrastructureCosts(
        featureId,
        organizationId,
        options
      );

      res.status(200).json({
        success: true,
        data: calculation
      });
    } catch (error) {
      logger.error(`[InfrastructureController] calculateCosts error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Bulk update infrastructure configurations
   * POST /api/infrastructure/bulk-update
   */
  async bulkUpdate(req, res, next) {
    try {
      const organizationId = req.user.organizationId || req.body.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400, 'ORGANIZATION_REQUIRED');
      }

      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        throw new AppError('Updates array is required', 400, 'UPDATES_REQUIRED');
      }

      const results = await infrastructureService.bulkUpdateInfrastructureConfig(
        organizationId,
        updates
      );

      res.status(200).json({
        success: true,
        message: `Updated ${results.successful.length} features`,
        data: results
      });
    } catch (error) {
      logger.error(`[InfrastructureController] bulkUpdate error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get organization infrastructure summary
   * GET /api/infrastructure/summary
   */
  async getOrganizationSummary(req, res, next) {
    try {
      const organizationId = req.user.organizationId || req.query.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400, 'ORGANIZATION_REQUIRED');
      }

      const summary = await infrastructureService.getOrganizationInfrastructureSummary(organizationId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error(`[InfrastructureController] getOrganizationSummary error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Apply infrastructure template to feature
   * POST /api/features/:featureId/infrastructure/apply-template
   */
  async applyTemplate(req, res, next) {
    try {
      const { featureId } = req.params;
      const { templateType, overrides } = req.body;
      const organizationId = req.user.organizationId || req.body.organizationId;

      if (!organizationId) {
        throw new AppError('Organization ID is required', 400, 'ORGANIZATION_REQUIRED');
      }

      if (!templateType) {
        throw new AppError('Template type is required', 400, 'TEMPLATE_TYPE_REQUIRED');
      }

      const updatedFeature = await infrastructureService.applyInfrastructureTemplate(
        featureId,
        organizationId,
        templateType,
        overrides
      );

      res.status(200).json({
        success: true,
        message: 'Infrastructure template applied successfully',
        data: {
          featureId: updatedFeature._id,
          name: updatedFeature.name,
          infrastructureCost: updatedFeature.infrastructureCost
        }
      });
    } catch (error) {
      logger.error(`[InfrastructureController] applyTemplate error: ${error.message}`);
      next(error);
    }
  }
}

export default new InfrastructureController();