/**
 * Landing Page Content Routes
 *
 * Routes for managing landing page content.
 */

import { Router } from 'express';
import {
  getPublicContent,
  getSectionContent,
  getAllContent,
  updateSectionContent,
  resetSectionContent,
  initializeDefaults
} from '../controllers/landingPageContent.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// ===========================================
// Public Routes (No authentication required)
// ===========================================

/**
 * @route   GET /landing-content
 * @desc    Get all landing page content for public display
 * @access  Public
 */
router.get('/landing-content', getPublicContent);

/**
 * @route   GET /landing-content/:section
 * @desc    Get specific section content
 * @access  Public
 */
router.get('/landing-content/:section', getSectionContent);

export default router;

// ===========================================
// Admin Routes (Super Admin only)
// Separate export for admin routes
// ===========================================

export const adminLandingContentRoutes = Router();

/**
 * @route   GET /
 * @desc    Get all landing page content (admin view)
 * @access  Super Admin
 */
adminLandingContentRoutes.get('/',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  getAllContent
);

/**
 * @route   PUT /:section
 * @desc    Update specific section content
 * @access  Super Admin
 */
adminLandingContentRoutes.put('/:section',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  updateSectionContent
);

/**
 * @route   POST /:section/reset
 * @desc    Reset section to default content
 * @access  Super Admin
 */
adminLandingContentRoutes.post('/:section/reset',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  resetSectionContent
);

/**
 * @route   POST /initialize
 * @desc    Initialize default content
 * @access  Super Admin
 */
adminLandingContentRoutes.post('/initialize',
  protect,
  restrictTo(ROLES.SUPER_ADMIN),
  initializeDefaults
);