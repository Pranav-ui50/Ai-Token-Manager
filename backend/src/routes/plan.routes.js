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
import { ROLES } from '../utils/constants.js';

const router = Router();

// All routes require authentication
router.use(protect);

// ===========================================
// Plan CRUD Routes
// ===========================================

/**
 * @route   POST /api/plans
 * @desc    Create a new plan
 * @access  Private (super_admin, org_owner, product_manager, finance_admin)
 */
router.post(
  '/',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER, ROLES.FINANCE_ADMIN),
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
 * @access  Private (super_admin, org_owner)
 */
router.post(
  '/calculate-profitability',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER),
  planController.calculateAllProfitability
);

/**
 * @route   PATCH /api/plans/reorder
 * @desc    Reorder plans
 * @access  Private (super_admin, org_owner, product_manager, finance_admin)
 */
router.patch(
  '/reorder',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER, ROLES.FINANCE_ADMIN),
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
 * @access  Private (super_admin, org_owner, product_manager, finance_admin)
 */
router.post(
  '/:id/clone',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER, ROLES.FINANCE_ADMIN),
  planController.clonePlan
);

/**
 * @route   PATCH /api/plans/:id/set-default
 * @desc    Set plan as default
 * @access  Private (super_admin, org_owner)
 */
router.patch(
  '/:id/set-default',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER),
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
 * @access  Private (super_admin, org_owner, product_manager, finance_admin)
 */
router.put(
  '/:id',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER, ROLES.FINANCE_ADMIN),
  validate(planValidators.update),
  planController.updatePlan
);

/**
 * @route   DELETE /api/plans/:id
 * @desc    Delete plan
 * @access  Private (super_admin, org_owner)
 */
router.delete(
  '/:id',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER),
  planController.deletePlan
);

export default router;