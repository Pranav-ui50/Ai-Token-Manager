/**
 * Provider Routes
 *
 * Routes for AI provider management.
 */

import express from 'express';
import providerController from '../controllers/provider.controller.js';
import modelController from '../controllers/model.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param } from 'express-validator';
import {
  validateCreate,
  validateUpdate,
  validateProviderId
} from '../validators/provider.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/providers
 * @desc    Create a new provider
 * @access  Private (Admin/Org Owner)
 */
router.post(
  '/',
  restrictTo('super_admin', 'org_owner'),
  validateCreate,
  providerController.create
);

/**
 * @route   GET /api/providers
 * @desc    Get all providers
 * @access  Private
 */
router.get(
  '/',
  providerController.getAll
);

/**
 * @route   GET /api/providers/statuses
 * @desc    Get all provider statuses (summary)
 * @access  Private (Admin/Org Owner)
 */
router.get(
  '/statuses',
  restrictTo('super_admin', 'org_owner'),
  providerController.getAllStatuses
);

/**
 * @route   GET /api/providers/supported/dynamic
 * @desc    Get list of providers that support dynamic model discovery
 * @access  Private
 */
router.get(
  '/supported/dynamic',
  providerController.getSupportedProviders
);

/**
 * @route   GET /api/providers/slug/:slug
 * @desc    Get provider by slug
 * @access  Private
 */
router.get(
  '/slug/:slug',
  providerController.getBySlug
);

/**
 * @route   GET /api/providers/:id
 * @desc    Get provider by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateProviderId,
  providerController.getById
);

/**
 * @route   GET /api/providers/:id/status
 * @desc    Get provider status with health check
 * @access  Private
 */
router.get(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid provider ID'),
    validate
  ],
  providerController.getStatus
);

/**
 * @route   GET /api/providers/:id/models
 * @desc    Get models for a provider
 * @access  Private
 */
router.get(
  '/:id/models',
  validateProviderId,
  modelController.getByProvider
);

/**
 * @route   GET /api/providers/:id/dynamic-models
 * @desc    Get dynamic models from provider API (with database fallback)
 * @access  Private
 */
router.get(
  '/:id/dynamic-models',
  [
    param('id').isMongoId().withMessage('Invalid provider ID'),
    validate
  ],
  providerController.getDynamicModels
);

/**
 * @route   POST /api/providers/:id/test-connectivity
 * @desc    Test provider API connectivity
 * @access  Private (Admin/Org Owner)
 */
router.post(
  '/:id/test-connectivity',
  restrictTo('super_admin', 'org_owner'),
  [
    param('id').isMongoId().withMessage('Invalid provider ID'),
    validate
  ],
  providerController.testConnectivity
);

/**
 * @route   PUT /api/providers/:id
 * @desc    Update provider
 * @access  Private (Admin/Org Owner)
 */
router.put(
  '/:id',
  restrictTo('super_admin', 'org_owner'),
  validateUpdate,
  providerController.update
);

/**
 * @route   PUT /api/providers/:id/toggle-status
 * @desc    Toggle provider status (activate/deactivate)
 * @access  Private (Admin/Org Owner)
 */
router.put(
  '/:id/toggle-status',
  restrictTo('super_admin', 'org_owner'),
  [
    param('id').isMongoId().withMessage('Invalid provider ID'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    validate
  ],
  providerController.toggleStatus
);

/**
 * @route   DELETE /api/providers/:id
 * @desc    Delete provider
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  restrictTo('super_admin'),
  validateProviderId,
  providerController.delete
);

/**
 * @route   DELETE /api/providers/:id/dynamic-models/cache
 * @desc    Clear dynamic models cache for a provider
 * @access  Private (Admin/Org Owner)
 */
router.delete(
  '/:id/dynamic-models/cache',
  restrictTo('super_admin', 'org_owner'),
  [
    param('id').isMongoId().withMessage('Invalid provider ID'),
    validate
  ],
  providerController.clearModelsCache
);

export default router;