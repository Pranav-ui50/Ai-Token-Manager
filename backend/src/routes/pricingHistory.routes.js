/**
 * Pricing History Routes
 *
 * Routes for pricing history management.
 */

import { Router } from 'express';
import pricingHistoryController from '../controllers/pricingHistory.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/pricing-history/recent
 * @desc    Get recent pricing changes
 * @access  Private (requires view_features permission)
 */
router.get('/recent',
  requirePermissions('view_features'),
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate
  ],
  pricingHistoryController.getRecentChanges
);

/**
 * @route   GET /api/pricing-history/statistics
 * @desc    Get pricing statistics
 * @access  Private (requires view_features permission)
 */
router.get('/statistics',
  requirePermissions('view_features'),
  pricingHistoryController.getStatistics
);

/**
 * @route   POST /api/pricing-history/compare
 * @desc    Compare prices between models
 * @access  Private (requires view_features permission)
 */
router.post('/compare',
  requirePermissions('view_features'),
  [
    body('modelIds')
      .isArray({ min: 2, max: 10 })
      .withMessage('Model IDs must be an array of 2-10 items'),
    body('modelIds.*')
      .isMongoId()
      .withMessage('Each model ID must be a valid MongoDB ID'),
    validate
  ],
  pricingHistoryController.comparePrices
);

/**
 * @route   GET /api/pricing-history/model/:modelId
 * @desc    Get pricing history for a model
 * @access  Private (requires view_features permission)
 */
router.get('/model/:modelId',
  requirePermissions('view_features'),
  [
    param('modelId').isMongoId().withMessage('Invalid model ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
    validate
  ],
  pricingHistoryController.getByModel
);

/**
 * @route   GET /api/pricing-history/provider/:providerId
 * @desc    Get pricing history for a provider
 * @access  Private (requires view_features permission)
 */
router.get('/provider/:providerId',
  requirePermissions('view_features'),
  [
    param('providerId').isMongoId().withMessage('Invalid provider ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be 0 or greater'),
    validate
  ],
  pricingHistoryController.getByProvider
);

/**
 * @route   GET /api/pricing-history/trends/:modelId
 * @desc    Get price trends for a model
 * @access  Private (requires view_features permission)
 */
router.get('/trends/:modelId',
  requirePermissions('view_features'),
  [
    param('modelId').isMongoId().withMessage('Invalid model ID'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    validate
  ],
  pricingHistoryController.getTrends
);

/**
 * @route   PUT /api/pricing-history/:id/verify
 * @desc    Verify a pricing change
 * @access  Private (requires manage_features permission)
 */
router.put('/:id/verify',
  requirePermissions('manage_features'),
  [
    param('id').isMongoId().withMessage('Invalid pricing history ID'),
    validate
  ],
  pricingHistoryController.verify
);

export default router;