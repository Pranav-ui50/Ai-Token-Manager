/**
 * Feature Controller
 *
 * Handles HTTP requests for feature endpoints.
 */

import featureService from '../services/feature.service.js';
import auditService from '../services/audit.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class FeatureController {
  /**
   * Create a new feature
   * @route POST /api/features
   */
  async createFeature(req, res, next) {
    try {
      // Use organization from request body if provided, otherwise fall back to user's organization
      const organizationId = req.body.organization || req.user.organization;

      if (!organizationId) {
        throw new AppError('Organization is required. Please select an organization.', 400, 'ORGANIZATION_REQUIRED');
      }

      const featureData = {
        ...req.body,
        organization: organizationId
      };

      const feature = await featureService.createFeature(featureData);

      // Log feature creation
      await auditService.logSuccess({
        organization: organizationId,
        user: req.user.id,
        action: 'create',
        resourceType: 'feature',
        resourceId: feature._id,
        resourceName: feature.name,
        description: `Feature "${feature.name}" created`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(201).json({
        success: true,
        message: 'Feature created successfully',
        data: { feature }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all features for organization
   * @route GET /api/features
   */
  async getFeatures(req, res, next) {
    try {
      const organizationId = req.user.organization;

      if (!organizationId) {
        throw new AppError('Organization is required. Please select an organization.', 400, 'ORGANIZATION_REQUIRED');
      }

      const { page, limit, status, category, search, project } = req.query;

      const result = await featureService.getFeatures(organizationId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        category,
        search,
        project
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feature by ID
   * @route GET /api/features/:id
   */
  async getFeature(req, res, next) {
    try {
      const { id } = req.params;
      // Organization ID is optional - if not provided, just find by ID
      const organizationId = req.user?.organization || null;

      const feature = await featureService.getFeature(id, organizationId);

      res.status(200).json({
        success: true,
        data: { feature }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update feature
   * @route PUT /api/features/:id
   */
  async updateFeature(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const feature = await featureService.updateFeature(id, organizationId, req.body);

      // Log feature update
      await auditService.logSuccess({
        organization: organizationId,
        user: req.user.id,
        action: 'update',
        resourceType: 'feature',
        resourceId: feature._id,
        resourceName: feature.name,
        description: `Feature "${feature.name}" updated`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(200).json({
        success: true,
        message: 'Feature updated successfully',
        data: { feature }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete feature
   * @route DELETE /api/features/:id
   */
  async deleteFeature(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const feature = await featureService.getFeature(id, organizationId);
      await featureService.deleteFeature(id, organizationId);

      // Log feature deletion
      await auditService.logSuccess({
        organization: organizationId,
        user: req.user.id,
        action: 'delete',
        resourceType: 'feature',
        resourceId: id,
        resourceName: feature?.name,
        description: `Feature "${feature?.name}" deleted`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(200).json({
        success: true,
        message: 'Feature deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update feature status
   * @route PATCH /api/features/bulk/status
   */
  async bulkUpdateStatus(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { featureIds, status } = req.body;

      if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
        throw new AppError('Feature IDs are required', 400, 'INVALID_REQUEST');
      }

      if (!['active', 'inactive', 'maintenance', 'deprecated'].includes(status)) {
        throw new AppError('Invalid status', 400, 'INVALID_STATUS');
      }

      const result = await featureService.bulkUpdateStatus(featureIds, organizationId, status);

      res.status(200).json({
        success: true,
        message: 'Features updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feature statistics
   * @route GET /api/features/stats
   */
  async getFeatureStats(req, res, next) {
    try {
      const organizationId = req.user.organization;

      const stats = await featureService.getFeatureStats(organizationId);

      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get features by category
   * @route GET /api/features/category/:category
   */
  async getFeaturesByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const organizationId = req.user.organization;

      const features = await featureService.getFeaturesByCategory(organizationId, category);

      res.status(200).json({
        success: true,
        data: { features }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate cost estimate for feature
   * @route POST /api/features/:id/calculate-cost
   */
  async calculateCostEstimate(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const { requestsPerMonth, usersPerMonth } = req.body;

      const estimate = await featureService.calculateCostEstimate(
        id,
        organizationId,
        { requestsPerMonth, usersPerMonth }
      );

      res.status(200).json({
        success: true,
        data: { estimate }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FeatureController();