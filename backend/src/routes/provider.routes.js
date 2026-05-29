/**
 * Provider Routes
 *
 * Routes for AI provider management.
 */

import express from 'express';
import providerController from '../controllers/provider.controller.js';
import modelController from '../controllers/model.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
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
 * @access  Private (Admin only)
 */
router.post(
  '/',
  restrictTo('super_admin'),
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
 * @route   GET /api/providers/slug/:slug
 * @desc    Get provider by slug
 * @access  Private
 */
router.get(
  '/slug/:slug',
  providerController.getBySlug
);

/**
 * @route   PUT /api/providers/:id
 * @desc    Update provider
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  restrictTo('super_admin'),
  validateUpdate,
  providerController.update
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
 * @route   GET /api/providers/:id/models
 * @desc    Get models for a provider
 * @access  Private
 */
router.get(
  '/:id/models',
  validateProviderId,
  modelController.getByProvider
);

export default router;