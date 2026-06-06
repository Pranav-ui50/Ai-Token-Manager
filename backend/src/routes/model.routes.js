/**
 * Model Routes
 *
 * Routes for AI model management.
 */

import express from 'express';
import modelController from '../controllers/model.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import {
  validateCreate,
  validateUpdate,
  validateModelId,
  validateCostCalculation,
  validateBulkPricing
} from '../validators/model.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/models
 * @desc    Create a new model
 * @access  Private (Admin/Org Owner)
 */
router.post(
  '/',
  restrictTo('super_admin', 'org_owner'),
  validateCreate,
  modelController.create
);

/**
 * @route   GET /api/models
 * @desc    Get all models
 * @access  Private
 */
router.get(
  '/',
  modelController.getAll
);

/**
 * @route   POST /api/models/bulk-pricing
 * @desc    Bulk update model pricing
 * @access  Private (Admin/Org Owner)
 */
router.post(
  '/bulk-pricing',
  restrictTo('super_admin', 'org_owner'),
  validateBulkPricing,
  modelController.bulkUpdatePricing
);

/**
 * @route   GET /api/models/:id
 * @desc    Get model by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateModelId,
  modelController.getById
);

/**
 * @route   GET /api/models/slug/:slug
 * @desc    Get model by slug
 * @access  Private
 */
router.get(
  '/slug/:slug',
  modelController.getBySlug
);

/**
 * @route   PUT /api/models/:id
 * @desc    Update model
 * @access  Private (Admin/Org Owner)
 */
router.put(
  '/:id',
  restrictTo('super_admin', 'org_owner'),
  validateUpdate,
  modelController.update
);

/**
 * @route   DELETE /api/models/:id
 * @desc    Delete model
 * @access  Private (Admin/Org Owner)
 */
router.delete(
  '/:id',
  restrictTo('super_admin', 'org_owner'),
  validateModelId,
  modelController.delete
);

/**
 * @route   POST /api/models/:id/calculate-cost
 * @desc    Calculate cost for model usage
 * @access  Private
 */
router.post(
  '/:id/calculate-cost',
  validateModelId,
  validateCostCalculation,
  modelController.calculateCost
);

export default router;