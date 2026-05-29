/**
 * Plan Routes
 *
 * Routes for plan management endpoints.
 */

import { Router } from 'express';
import planController from '../controllers/plan.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { planValidators } from '../validators/plan.validators.js';

const router = Router();

// All routes require authentication
router.use(protect);

// ===========================================
// Plan CRUD Routes
// ===========================================

/**
 * @route   POST /api/plans
 * @desc    Create a new plan
 * @access  Private (admin, owner, editor)
 */
router.post(
  '/',
  restrictTo('admin', 'owner', 'editor'),
  validate(planValidators.create),
  planController.createPlan
);

/**
 * @route   GET /api/plans
 * @desc    Get all plans for organization
 * @access  Private
 */
router.get(
  '/',
  planController.getPlans
);

/**
 * @route   GET /api/plans/public
 * @desc    Get public plans
 * @access  Private
 */
router.get(
  '/public',
  planController.getPublicPlans
);

/**
 * @route   GET /api/plans/stats
 * @desc    Get plan statistics
 * @access  Private
 */
router.get(
  '/stats',
  planController.getPlanStats
);

/**
 * @route   POST /api/plans/compare
 * @desc    Compare multiple plans
 * @access  Private
 */
router.post(
  '/compare',
  validate(planValidators.compare),
  planController.comparePlans
);

/**
 * @route   POST /api/plans/calculate-profitability
 * @desc    Calculate profitability for all plans
 * @access  Private (admin, owner)
 */
router.post(
  '/calculate-profitability',
  restrictTo('admin', 'owner'),
  planController.calculateAllProfitability
);

/**
 * @route   PATCH /api/plans/reorder
 * @desc    Reorder plans
 * @access  Private (admin, owner, editor)
 */
router.patch(
  '/reorder',
  restrictTo('admin', 'owner', 'editor'),
  validate(planValidators.reorder),
  planController.reorderPlans
);

/**
 * @route   GET /api/plans/slug/:slug
 * @desc    Get plan by slug
 * @access  Private
 */
router.get(
  '/slug/:slug',
  planController.getPlanBySlug
);

/**
 * @route   POST /api/plans/:id/clone
 * @desc    Clone a plan
 * @access  Private (admin, owner, editor)
 */
router.post(
  '/:id/clone',
  restrictTo('admin', 'owner', 'editor'),
  planController.clonePlan
);

/**
 * @route   PATCH /api/plans/:id/set-default
 * @desc    Set plan as default
 * @access  Private (admin, owner)
 */
router.patch(
  '/:id/set-default',
  restrictTo('admin', 'owner'),
  planController.setDefaultPlan
);

/**
 * @route   GET /api/plans/:id
 * @desc    Get plan by ID
 * @access  Private
 */
router.get(
  '/:id',
  planController.getPlan
);

/**
 * @route   PUT /api/plans/:id
 * @desc    Update plan
 * @access  Private (admin, owner, editor)
 */
router.put(
  '/:id',
  restrictTo('admin', 'owner', 'editor'),
  validate(planValidators.update),
  planController.updatePlan
);

/**
 * @route   DELETE /api/plans/:id
 * @desc    Delete plan
 * @access  Private (admin, owner)
 */
router.delete(
  '/:id',
  restrictTo('admin', 'owner'),
  planController.deletePlan
);

export default router;