/**
 * ApiKey Controller
 *
 * Handles HTTP requests for API key endpoints.
 * FR-48: API Credential Management
 */

import apiKeyService from '../services/apiKey.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class ApiKeyController {
  /**
   * Create a new API key
   * @route POST /api/api-keys
   */
  async create(req, res, next) {
    try {
      logger.info(`[ApiKeyController] create called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;
      const userId = req.user.id;

      const result = await apiKeyService.create({
        organizationId,
        ...req.body
      }, userId);

      // Note: plainKey is only returned once during creation
      res.status(201).json({
        success: true,
        message: 'API key created successfully. Save the key now - it will not be shown again.',
        data: {
          ...result,
          // Warning about plain key security
          _warning: 'Store this API key securely. It will not be shown again.'
        }
      });
    } catch (error) {
      logger.error(`[ApiKeyController] Create error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get API key by ID
   * @route GET /api/api-keys/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const apiKey = await apiKeyService.getById(id, organizationId);

      res.status(200).json({
        success: true,
        data: apiKey
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all API keys for organization
   * @route GET /api/api-keys
   */
  async getForOrganization(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { status, userId, page, limit } = req.query;

      const result = await apiKeyService.getForOrganization(organizationId, {
        status,
        userId,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.status(200).json({
        success: true,
        data: result.apiKeys,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API keys for current user
   * @route GET /api/api-keys/my-keys
   */
  async getMyKeys(req, res, next) {
    try {
      const userId = req.user.id;

      const apiKeys = await apiKeyService.getForUser(userId);

      res.status(200).json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update API key
   * @route PUT /api/api-keys/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const apiKey = await apiKeyService.update(id, req.body, organizationId);

      res.status(200).json({
        success: true,
        message: 'API key updated successfully',
        data: apiKey
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate API key
   * @route POST /api/api-keys/:id/regenerate
   */
  async regenerate(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const result = await apiKeyService.regenerate(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'API key regenerated successfully. Save the new key now - it will not be shown again.',
        data: {
          ...result,
          _warning: 'Store this new API key securely. The old key is no longer valid.'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API key
   * @route POST /api/api-keys/:id/revoke
   */
  async revoke(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const userId = req.user.id;
      const { reason } = req.body;

      const apiKey = await apiKeyService.revoke(id, organizationId, userId, reason);

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
        data: apiKey
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete API key
   * @route DELETE /api/api-keys/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      await apiKeyService.delete(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key usage statistics
   * @route GET /api/api-keys/:id/stats
   */
  async getUsageStats(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const stats = await apiKeyService.getUsageStats(id, organizationId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate API key (used by auth middleware for API auth)
   * This endpoint is typically used internally, but can be used for validation
   * @route POST /api/api-keys/validate
   */
  async validate(req, res, next) {
    try {
      const { apiKey } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await apiKeyService.validate(apiKey, ip, userAgent);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role
          },
          organization: {
            id: result.organization._id,
            name: result.organization.name
          },
          permissions: result.apiKey.permissions,
          scopes: result.apiKey.scopes,
          rateLimit: result.apiKey.rateLimit
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ApiKeyController();