/**
 * Pricing Engine Routes
 *
 * Routes for pricing engine calculations.
 */

import { Router } from 'express';
import pricingEngineController from '../controllers/pricingEngine.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

// ==========================================
// FR-22: Calculate API Token Costs
// ==========================================

/**
 * @route   POST /api/pricing-engine/calculate/model/:modelId
 * @desc    Calculate cost for a specific model
 * @access  Private (requires view_features permission)
 */
router.post('/calculate/model/:modelId',
  requirePermissions('view_features'),
  [
    param('modelId').isMongoId().withMessage('Invalid model ID'),
    body('inputTokens').isInt({ min: 0 }).withMessage('Input tokens must be a non-negative integer'),
    body('outputTokens').isInt({ min: 0 }).withMessage('Output tokens must be a non-negative integer'),
    body('infrastructureOverhead').optional().isFloat({ min: 0, max: 100 }).withMessage('Overhead must be between 0 and 100'),
    body('fixedCostPerRequest').optional().isFloat({ min: 0 }).withMessage('Fixed cost must be non-negative'),
    validate
  ],
  pricingEngineController.calculateModelCost
);

/**
 * @route   POST /api/pricing-engine/calculate/models
 * @desc    Calculate cost for multiple models
 * @access  Private (requires view_features permission)
 */
router.post('/calculate/models',
  requirePermissions('view_features'),
  [
    body('models').isArray({ min: 1 }).withMessage('At least one model ID is required'),
    body('models.*').isMongoId().withMessage('Each model ID must be a valid MongoDB ID'),
    body('inputTokens').isInt({ min: 0 }).withMessage('Input tokens must be a non-negative integer'),
    body('outputTokens').isInt({ min: 0 }).withMessage('Output tokens must be a non-negative integer'),
    validate
  ],
  pricingEngineController.calculateMultiModelCost
);

// ==========================================
// FR-23: Feature-level Costs
// ==========================================

/**
 * @route   POST /api/pricing-engine/calculate/feature/:featureId
 * @desc    Calculate cost for a feature
 * @access  Private (requires view_features permission)
 */
router.post('/calculate/feature/:featureId',
  requirePermissions('view_features'),
  [
    param('featureId').isMongoId().withMessage('Invalid feature ID'),
    body('requests').optional().isInt({ min: 1 }).withMessage('Requests must be a positive integer'),
    body('users').optional().isInt({ min: 1 }).withMessage('Users must be a positive integer'),
    validate
  ],
  pricingEngineController.calculateFeatureCost
);

// ==========================================
// FR-24: User-level Operational Costs
// ==========================================

/**
 * @route   POST /api/pricing-engine/calculate/user/:userId
 * @desc    Calculate operational costs for a user
 * @access  Private (requires view_analytics permission)
 */
router.post('/calculate/user/:userId',
  requirePermissions('view_analytics'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('featureUsage').optional().isArray().withMessage('Feature usage must be an array'),
    body('featureUsage.*.featureId').optional().isMongoId().withMessage('Invalid feature ID'),
    body('featureUsage.*.requests').optional().isInt({ min: 0 }).withMessage('Requests must be non-negative'),
    body('directApiUsage').optional().isArray().withMessage('Direct API usage must be an array'),
    body('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period'),
    validate
  ],
  pricingEngineController.calculateUserCosts
);

/**
 * @route   POST /api/pricing-engine/aggregate/model
 * @desc    Aggregate costs by model
 * @access  Private (requires view_analytics permission)
 */
router.post('/aggregate/model',
  requirePermissions('view_analytics'),
  [
    body('costs').isArray().withMessage('Costs must be an array'),
    validate
  ],
  pricingEngineController.aggregateCostsByModel
);

// ==========================================
// FR-25: Subscription Profitability
// ==========================================

/**
 * @route   POST /api/pricing-engine/calculate/plan/:planId/profitability
 * @desc    Calculate plan profitability
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/plan/:planId/profitability',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    body('actualUsage').optional().isObject().withMessage('Actual usage must be an object'),
    validate
  ],
  pricingEngineController.calculatePlanProfitability
);

// ==========================================
// FR-26: Multiple Pricing Models
// ==========================================

/**
 * @route   POST /api/pricing-engine/calculate/pricing-model/:planId
 * @desc    Calculate cost by pricing model type
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/pricing-model/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    body('usage').optional().isObject().withMessage('Usage must be an object'),
    validate
  ],
  pricingEngineController.calculateByPricingModel
);

/**
 * @route   POST /api/pricing-engine/calculate/flat/:planId
 * @desc    Calculate flat pricing cost
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/flat/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    validate
  ],
  pricingEngineController.calculateFlatPricing
);

/**
 * @route   POST /api/pricing-engine/calculate/usage-based/:planId
 * @desc    Calculate usage-based pricing cost
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/usage-based/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    body('usage.tokens').optional().isInt({ min: 0 }).withMessage('Tokens must be non-negative'),
    body('usage.requests').optional().isInt({ min: 0 }).withMessage('Requests must be non-negative'),
    validate
  ],
  pricingEngineController.calculateUsageBasedPricing
);

/**
 * @route   POST /api/pricing-engine/calculate/tiered/:planId
 * @desc    Calculate tiered pricing cost
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/tiered/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    body('usage.tokens').optional().isInt({ min: 0 }).withMessage('Tokens must be non-negative'),
    validate
  ],
  pricingEngineController.calculateTieredPricing
);

/**
 * @route   POST /api/pricing-engine/calculate/credit/:planId
 * @desc    Calculate credit-based pricing cost
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/credit/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    body('creditsUsed').optional().isInt({ min: 0 }).withMessage('Credits used must be non-negative'),
    validate
  ],
  pricingEngineController.calculateCreditBasedPricing
);

// ==========================================
// FR-27: Margin Calculations
// ==========================================

/**
 * @route   POST /api/pricing-engine/calculate/margins/:planId
 * @desc    Calculate margin scenarios
 * @access  Private (requires view_plans permission)
 */
router.post('/calculate/margins/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    body('scenarios').optional().isArray().withMessage('Scenarios must be an array'),
    validate
  ],
  pricingEngineController.calculateMarginScenarios
);

// ==========================================
// FR-28: Break-even Analysis
// ==========================================

/**
 * @route   GET /api/pricing-engine/analysis/break-even/:planId
 * @desc    Calculate break-even analysis
 * @access  Private (requires view_plans permission)
 */
router.get('/analysis/break-even/:planId',
  requirePermissions('view_plans'),
  [
    param('planId').isMongoId().withMessage('Invalid plan ID'),
    query('scenarios').optional().isString().withMessage('Scenarios must be a JSON string'),
    validate
  ],
  pricingEngineController.calculateBreakEvenAnalysis
);

// ==========================================
// Real-time Cost Estimation
// ==========================================

/**
 * @route   POST /api/pricing-engine/estimate/feature
 * @desc    Estimate costs for a new feature
 * @access  Private (requires view_features permission)
 */
router.post('/estimate/feature',
  requirePermissions('view_features'),
  [
    body('modelId').isMongoId().withMessage('Invalid model ID'),
    body('inputTokensPerRequest').optional().isInt({ min: 0 }).withMessage('Input tokens must be non-negative'),
    body('outputTokensPerRequest').optional().isInt({ min: 0 }).withMessage('Output tokens must be non-negative'),
    body('estimatedRequests').optional().isInt({ min: 1 }).withMessage('Estimated requests must be positive'),
    body('infrastructureOverhead').optional().isFloat({ min: 0, max: 100 }).withMessage('Overhead must be between 0 and 100'),
    body('fixedCostPerRequest').optional().isFloat({ min: 0 }).withMessage('Fixed cost must be non-negative'),
    validate
  ],
  pricingEngineController.estimateFeatureCosts
);

/**
 * @route   POST /api/pricing-engine/compare/models
 * @desc    Compare costs between models
 * @access  Private (requires view_features permission)
 */
router.post('/compare/models',
  requirePermissions('view_features'),
  [
    body('modelIds').isArray({ min: 2 }).withMessage('At least 2 model IDs are required'),
    body('modelIds.*').isMongoId().withMessage('Each model ID must be a valid MongoDB ID'),
    body('inputTokens').isInt({ min: 0 }).withMessage('Input tokens must be non-negative'),
    body('outputTokens').isInt({ min: 0 }).withMessage('Output tokens must be non-negative'),
    validate
  ],
  pricingEngineController.compareModelCosts
);

/**
 * @route   POST /api/pricing-engine/quick-calculate
 * @desc    Quick cost calculation
 * @access  Private (requires view_features permission)
 */
router.post('/quick-calculate',
  requirePermissions('view_features'),
  [
    body('modelId').optional().isMongoId().withMessage('Invalid model ID'),
    body('featureId').optional().isMongoId().withMessage('Invalid feature ID'),
    body('inputTokens').optional().isInt({ min: 0 }).withMessage('Input tokens must be non-negative'),
    body('outputTokens').optional().isInt({ min: 0 }).withMessage('Output tokens must be non-negative'),
    body('requests').optional().isInt({ min: 1 }).withMessage('Requests must be positive'),
    validate
  ],
  pricingEngineController.quickCalculate
);

export default router;