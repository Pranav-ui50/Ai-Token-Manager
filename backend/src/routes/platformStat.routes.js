/**
 * Platform Statistics Routes
 *
 * Public and admin routes for platform statistics.
 */

import { Router } from 'express';
import {
  getActiveStats,
  getAllStats,
  getStatByKey,
  updateStat,
  updateStatByKey,
  reorderStats,
  initializeDefaults
} from '../controllers/platformStat.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param } from 'express-validator';

const router = Router();

// ===========================================
// Validation Schemas
// ===========================================

const updateStatValidation = [
  param('id')
    .isMongoId().withMessage('Invalid stat ID'),
  body('statValue')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Stat value cannot exceed 50 characters'),
  body('statLabel')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Stat label cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Icon cannot exceed 10 characters'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

const reorderValidation = [
  body('orderIds')
    .isArray({ min: 1 }).withMessage('orderIds must be a non-empty array')
    .custom((value) => {
      if (!value.every(id => /^[0-9a-fA-F]{24}$/.test(id))) {
        throw new Error('All IDs must be valid MongoDB ObjectIds');
      }
      return true;
    })
];

// ===========================================
// Public Routes (No Authentication)
// ===========================================

/**
 * @route GET /api/platform-stats
 * @desc Get all active platform stats
 * @access Public
 */
router.get('/', getActiveStats);

// ===========================================
// Admin Routes (Authentication + Super Admin Role)
// ===========================================

/**
 * @route GET /api/admin/platform-stats
 * @desc Get all platform stats
 * @access Super Admin
 */
router.get('/admin', protect, restrictTo('super_admin'), getAllStats);

/**
 * @route GET /api/admin/platform-stats/:key
 * @desc Get stat by key
 * @access Super Admin
 */
router.get('/admin/key/:key', protect, restrictTo('super_admin'), getStatByKey);

/**
 * @route PUT /api/admin/platform-stats/:id
 * @desc Update platform stat by ID
 * @access Super Admin
 */
router.put('/admin/:id', protect, restrictTo('super_admin'), validate(updateStatValidation), updateStat);

/**
 * @route PUT /api/admin/platform-stats/key/:key
 * @desc Update platform stat by key
 * @access Super Admin
 */
router.put('/admin/key/:key', protect, restrictTo('super_admin'), updateStatByKey);

/**
 * @route PATCH /api/admin/platform-stats/reorder
 * @desc Reorder platform stats
 * @access Super Admin
 */
router.patch('/admin/reorder', protect, restrictTo('super_admin'), validate(reorderValidation), reorderStats);

/**
 * @route POST /api/admin/platform-stats/initialize
 * @desc Initialize default platform stats
 * @access Super Admin
 */
router.post('/admin/initialize', protect, restrictTo('super_admin'), initializeDefaults);

export default router;