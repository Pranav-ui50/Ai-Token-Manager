/**
 * Break-Even Analysis Routes
 *
 * Routes for break-even analysis and margin calculations.
 */

import { Router } from 'express';
import breakevenController from '../controllers/breakeven.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/breakeven/compare
 * @desc    Compare break-even analysis across multiple plans
 * @access  Private (requires view_plans permission)
 */
router.post('/compare',
  requirePermissions('view_plans'),
  breakevenController.comparePlans
);

/**
 * @route   GET /api/organizations/:organizationId/breakeven/summary
 * @desc    Get organization-wide break-even summary
 * @access  Private (requires view_plans permission)
 */
router.get('/organizations/:organizationId/summary',
  requirePermissions('view_plans'),
  breakevenController.getOrganizationSummary
);

/**
 * @route   GET /api/plans/:planId/breakeven
 * @desc    Get break-even analysis for a plan
 * @access  Private (requires view_plans permission)
 */
router.get('/plans/:planId',
  requirePermissions('view_plans'),
  breakevenController.getBreakEvenAnalysis
);

/**
 * @route   GET /api/plans/:planId/breakeven/scenarios
 * @desc    Get margin scenarios for a plan
 * @access  Private (requires view_plans permission)
 */
router.get('/plans/:planId/scenarios',
  requirePermissions('view_plans'),
  breakevenController.getMarginScenarios
);

/**
 * @route   GET /api/plans/:planId/breakeven/sensitivity
 * @desc    Get sensitivity analysis for a plan
 * @access  Private (requires view_plans permission)
 */
router.get('/plans/:planId/sensitivity',
  requirePermissions('view_plans'),
  breakevenController.getSensitivityAnalysis
);

/**
 * @route   GET /api/plans/:planId/breakeven/thresholds
 * @desc    Get profit thresholds for a plan
 * @access  Private (requires view_plans permission)
 */
router.get('/plans/:planId/thresholds',
  requirePermissions('view_plans'),
  breakevenController.getProfitThresholds
);

/**
 * @route   POST /api/plans/:planId/breakeven/price-impact
 * @desc    Calculate price change impact on break-even
 * @access  Private (requires manage_plans permission)
 */
router.post('/plans/:planId/price-impact',
  requirePermissions('manage_plans'),
  breakevenController.calculatePriceImpact
);

export default router;