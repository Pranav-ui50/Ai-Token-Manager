/**
 * Provider Controller
 *
 * HTTP handlers for AI provider endpoints.
 */

import providerService from '../services/provider.service.js';

class ProviderController {
  /**
   * Create a new provider
   */
  async create(req, res, next) {
    try {
      const provider = await providerService.create(req.body, req.user.id);

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
      const provider = await providerService.update(
        req.params.id,
        req.body,
        req.user.id
      );

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
}

export default new ProviderController();