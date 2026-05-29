/**
 * Infrastructure Routes
 *
 * Routes for infrastructure overhead configuration.
 */

import { Router } from 'express';
import infrastructureController from '../controllers/infrastructure.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/infrastructure/templates
 * @desc    Get infrastructure configuration templates
 * @access  Private (requires view_features permission)
 */
router.get('/templates',
  requirePermissions('view_features'),
  infrastructureController.getTemplates
);

/**
 * @route   GET /api/infrastructure/summary
 * @desc    Get organization-wide infrastructure summary
 * @access  Private (requires view_features permission)
 */
router.get('/summary',
  requirePermissions('view_features'),
  infrastructureController.getOrganizationSummary
);

/**
 * @route   POST /api/infrastructure/bulk-update
 * @desc    Bulk update infrastructure configurations for multiple features
 * @access  Private (requires manage_features permission)
 */
router.post('/bulk-update',
  requirePermissions('manage_features'),
  infrastructureController.bulkUpdate
);

/**
 * @route   GET /api/features/:featureId/infrastructure
 * @desc    Get infrastructure configuration for a feature
 * @access  Private (requires view_features permission)
 */
router.get('/features/:featureId',
  requirePermissions('view_features'),
  infrastructureController.getConfig
);

/**
 * @route   PUT /api/features/:featureId/infrastructure
 * @desc    Update infrastructure configuration for a feature
 * @access  Private (requires manage_features permission)
 */
router.put('/features/:featureId',
  requirePermissions('manage_features'),
  infrastructureController.updateConfig
);

/**
 * @route   POST /api/features/:featureId/infrastructure/calculate
 * @desc    Calculate infrastructure costs for a feature
 * @access  Private (requires view_features permission)
 */
router.post('/features/:featureId/calculate',
  requirePermissions('view_features'),
  infrastructureController.calculateCosts
);

/**
 * @route   POST /api/features/:featureId/infrastructure/apply-template
 * @desc    Apply infrastructure template to a feature
 * @access  Private (requires manage_features permission)
 */
router.post('/features/:featureId/apply-template',
  requirePermissions('manage_features'),
  infrastructureController.applyTemplate
);

export default router;