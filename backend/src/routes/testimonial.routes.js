/**
 * Testimonial Routes
 *
 * Public and admin routes for testimonials.
 */

import { Router } from 'express';
import {
  getActiveTestimonials,
  getAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonial,
  reorderTestimonials
} from '../controllers/testimonial.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param } from 'express-validator';

const router = Router();

// ===========================================
// Validation Schemas
// ===========================================

const createTestimonialValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isLength({ max: 100 }).withMessage('Role cannot exceed 100 characters'),
  body('company')
    .trim()
    .notEmpty().withMessage('Company is required')
    .isLength({ max: 100 }).withMessage('Company cannot exceed 100 characters'),
  body('content')
    .trim()
    .notEmpty().withMessage('Testimonial content is required')
    .isLength({ max: 500 }).withMessage('Testimonial cannot exceed 500 characters'),
  body('rating')
    .isFloat({ min: 1.0, max: 5.0 }).withMessage('Rating must be between 1.0 and 5.0'),
  body('isVerified')
    .optional()
    .isBoolean().withMessage('isVerified must be a boolean'),
  body('source')
    .optional()
    .isIn(['organic', 'requested', 'imported']).withMessage('Invalid source value')
];

const updateTestimonialValidation = [
  param('id')
    .isMongoId().withMessage('Invalid testimonial ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('role')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Role cannot exceed 100 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company cannot exceed 100 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Testimonial cannot exceed 500 characters'),
  body('rating')
    .optional()
    .isFloat({ min: 1.0, max: 5.0 }).withMessage('Rating must be between 1.0 and 5.0'),
  body('isVerified')
    .optional()
    .isBoolean().withMessage('isVerified must be a boolean'),
  body('source')
    .optional()
    .isIn(['organic', 'requested', 'imported']).withMessage('Invalid source value')
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
 * @route GET /api/testimonials
 * @desc Get all active testimonials
 * @access Public
 */
router.get('/', getActiveTestimonials);

// ===========================================
// Admin Routes (Authentication + Super Admin Role)
// ===========================================

/**
 * @route GET /api/admin/testimonials
 * @desc Get all testimonials (including inactive)
 * @access Super Admin
 */
router.get('/admin', protect, restrictTo('super_admin'), getAllTestimonials);

/**
 * @route GET /api/admin/testimonials/:id
 * @desc Get testimonial by ID
 * @access Super Admin
 */
router.get('/admin/:id', protect, restrictTo('super_admin'), getTestimonialById);

/**
 * @route POST /api/admin/testimonials
 * @desc Create new testimonial
 * @access Super Admin
 */
router.post('/admin', protect, restrictTo('super_admin'), validate(createTestimonialValidation), createTestimonial);

/**
 * @route PUT /api/admin/testimonials/:id
 * @desc Update testimonial
 * @access Super Admin
 */
router.put('/admin/:id', protect, restrictTo('super_admin'), validate(updateTestimonialValidation), updateTestimonial);

/**
 * @route DELETE /api/admin/testimonials/:id
 * @desc Delete testimonial
 * @access Super Admin
 */
router.delete('/admin/:id', protect, restrictTo('super_admin'), deleteTestimonial);

/**
 * @route PATCH /api/admin/testimonials/:id/toggle
 * @desc Toggle testimonial active status
 * @access Super Admin
 */
router.patch('/admin/:id/toggle', protect, restrictTo('super_admin'), toggleTestimonial);

/**
 * @route PATCH /api/admin/testimonials/reorder
 * @desc Reorder testimonials
 * @access Super Admin
 */
router.patch('/admin/reorder', protect, restrictTo('super_admin'), validate(reorderValidation), reorderTestimonials);

export default router;