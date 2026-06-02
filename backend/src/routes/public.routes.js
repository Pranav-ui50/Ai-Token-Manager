/**
 * Public Routes
 *
 * Routes for public landing page - no authentication required.
 */

import { Router } from 'express';
import {
  getPublicPlans,
  getPublicPlan,
  getPublicProviders,
  getPublicProvider,
  getPublicStats,
  getPublicFeatures
} from '../controllers/public.controller.js';

const router = Router();

/**
 * @route   GET /api/public/plans
 * @desc    Get all public plans
 * @access  Public
 */
router.get('/plans', getPublicPlans);

/**
 * @route   GET /api/public/plans/:id
 * @desc    Get single public plan by ID
 * @access  Public
 */
router.get('/plans/:id', getPublicPlan);

/**
 * @route   GET /api/public/providers
 * @desc    Get all public providers
 * @access  Public
 */
router.get('/providers', getPublicProviders);

/**
 * @route   GET /api/public/providers/:id
 * @desc    Get single public provider by ID or slug
 * @access  Public
 */
router.get('/providers/:id', getPublicProvider);

/**
 * @route   GET /api/public/stats
 * @desc    Get public platform statistics
 * @access  Public
 */
router.get('/stats', getPublicStats);

/**
 * @route   GET /api/public/features
 * @desc    Get public features
 * @access  Public
 */
router.get('/features', getPublicFeatures);

export default router;