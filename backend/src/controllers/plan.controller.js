/**
 * Plan Controller
 *
 * Handles HTTP requests for plan endpoints.
 */

import planService from '../services/plan.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class PlanController {
  /**
   * Create a new plan
   * @route POST /api/plans
   */
  async createPlan(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const planData = {
        ...req.body,
        organization: organizationId
      };

      const plan = await planService.createPlan(planData);

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all plans for organization
   * @route GET /api/plans
   */
  async getPlans(req, res, next) {
    try {
      const organizationId = req.user.organization;
      const { page, limit, status, tier, public: isPublic } = req.query;

      const result = await planService.getPlans(organizationId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        tier,
        public: isPublic
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
   * Get public plans
   * @route GET /api/plans/public
   */
  async getPublicPlans(req, res, next) {
    try {
      const organizationId = req.user.organization;

      const plans = await planService.getPublicPlans(organizationId);

      res.status(200).json({
        success: true,
        data: { plans }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plan by ID
   * @route GET /api/plans/:id
   */
  async getPlan(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const plan = await planService.getPlan(id, organizationId);

      res.status(200).json({
        success: true,
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plan by slug
   * @route GET /api/plans/slug/:slug
   */
  async getPlanBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const organizationId = req.user.organization;

      const plan = await planService.getPlanBySlug(slug, organizationId);

      res.status(200).json({
        success: true,
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update plan
   * @route PUT /api/plans/:id
   */
  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const plan = await planService.updatePlan(id, organizationId, req.body);

      res.status(200).json({
        success: true,
        message: 'Plan updated successfully',
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete plan
   * @route DELETE /api/plans/:id
   */
  async deletePlan(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      await planService.deletePlan(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare plans
   * @route POST /api/plans/compare
   */
  async comparePlans(req, res, next) {
    try {
      const { planIds } = req.body;
      const organizationId = req.user.organization;

      if (!planIds || !Array.isArray(planIds) || planIds.length < 2) {
        throw new AppError('At least 2 plan IDs are required', 400, 'INVALID_REQUEST');
      }

      const comparison = await planService.comparePlans(planIds, organizationId);

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get plan statistics
   * @route GET /api/plans/stats
   */
  async getPlanStats(req, res, next) {
    try {
      const organizationId = req.user.organization;

      const stats = await planService.getPlanStats(organizationId);

      res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clone a plan
   * @route POST /api/plans/:id/clone
   */
  async clonePlan(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const { name } = req.body;

      const clonedPlan = await planService.clonePlan(id, organizationId, { name });

      res.status(201).json({
        success: true,
        message: 'Plan cloned successfully',
        data: { plan: clonedPlan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate profitability for all plans
   * @route POST /api/plans/calculate-profitability
   */
  async calculateAllProfitability(req, res, next) {
    try {
      const organizationId = req.user.organization;

      const results = await planService.calculateAllProfitability(organizationId);

      res.status(200).json({
        success: true,
        message: 'Profitability calculated for all plans',
        data: { results }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set default plan
   * @route PATCH /api/plans/:id/set-default
   */
  async setDefaultPlan(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;

      const plan = await planService.updatePlan(id, organizationId, {
        'settings.isDefault': true
      });

      res.status(200).json({
        success: true,
        message: 'Default plan updated',
        data: { plan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update plan order
   * @route PATCH /api/plans/reorder
   */
  async reorderPlans(req, res, next) {
    try {
      const { planOrders } = req.body; // Array of { id, displayOrder }
      const organizationId = req.user.organization;

      if (!planOrders || !Array.isArray(planOrders)) {
        throw new AppError('Plan orders are required', 400, 'INVALID_REQUEST');
      }

      const updates = planOrders.map(({ id, displayOrder }) =>
        planService.updatePlan(id, organizationId, { displayOrder })
      );

      await Promise.all(updates);

      res.status(200).json({
        success: true,
        message: 'Plans reordered successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PlanController();