/**
 * Feature Routes
 *
 * Routes for feature management endpoints.
 */

import { Router } from 'express';
import featureController from '../controllers/feature.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { featureValidators } from '../validators/feature.validators.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// All routes require authentication
router.use(protect);

// ===========================================
// Feature CRUD Routes
// ===========================================

/**
 * @route   POST /api/features
 * @desc    Create a new feature
 * @access  Private (super_admin, org_owner, product_manager)
 */
router.post(
  '/',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER),
  validate(featureValidators.create),
  featureController.createFeature
);

/**
 * @route   GET /api/features
 * @desc    Get all features for organization
 * @access  Private
 */
router.get(
  '/',
  featureController.getFeatures
);

/**
 * @route   GET /api/features/stats
 * @desc    Get feature statistics
 * @access  Private
 */
router.get(
  '/stats',
  featureController.getFeatureStats
);

/**
 * @route   GET /api/features/category/:category
 * @desc    Get features by category
 * @access  Private
 */
router.get(
  '/category/:category',
  featureController.getFeaturesByCategory
);

/**
 * @route   PATCH /api/features/bulk/status
 * @desc    Bulk update feature status
 * @access  Private (super_admin, org_owner)
 */
router.patch(
  '/bulk/status',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER),
  validate(featureValidators.bulkStatus),
  featureController.bulkUpdateStatus
);

/**
 * @route   POST /api/features/:id/calculate-cost
 * @desc    Calculate cost estimate for feature
 * @access  Private
 */
router.post(
  '/:id/calculate-cost',
  validate(featureValidators.calculateCost),
  featureController.calculateCostEstimate
);

/**
 * @route   POST /api/features/:id/usage
 * @desc    Record usage for a feature
 * @access  Private
 */
router.post(
  '/:id/usage',
  featureController.recordUsage
);

/**
 * @route   GET /api/features/:id/usage
 * @desc    Get usage history for a feature
 * @access  Private
 */
router.get(
  '/:id/usage',
  featureController.getUsageHistory
);

/**
 * @route   GET /api/features/:id
 * @desc    Get feature by ID
 * @access  Private
 */
router.get(
  '/:id',
  featureController.getFeature
);

/**
 * @route   PUT /api/features/:id
 * @desc    Update feature
 * @access  Private (super_admin, org_owner, product_manager)
 */
router.put(
  '/:id',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER),
  validate(featureValidators.update),
  featureController.updateFeature
);

/**
 * @route   DELETE /api/features/:id
 * @desc    Delete feature
 * @access  Private (super_admin, org_owner, product_manager)
 */
router.delete(
  '/:id',
  restrictTo(ROLES.SUPER_ADMIN, ROLES.ORG_OWNER, ROLES.PRODUCT_MANAGER),
  featureController.deleteFeature
);

export default router;