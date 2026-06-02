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
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// ===========================================
// Public Routes (No authentication required)
// ===========================================

/**
 * @route   GET /api/public/landing-content
 * @desc    Get all landing page content for public display
 * @access  Public
 */
router.get('/landing-content', getPublicContent);

/**
 * @route   GET /api/public/landing-content/:section
 * @desc    Get specific section content
 * @access  Public
 */
router.get('/landing-content/:section', getSectionContent);

// ===========================================
// Admin Routes (Super Admin only)
// ===========================================

/**
 * @route   GET /api/admin/landing-content
 * @desc    Get all landing page content (admin view)
 * @access  Super Admin
 */
router.get('/admin/landing-content',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  getAllContent
);

/**
 * @route   PUT /api/admin/landing-content/:section
 * @desc    Update specific section content
 * @access  Super Admin
 */
router.put('/admin/landing-content/:section',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  updateSectionContent
);

/**
 * @route   POST /api/admin/landing-content/:section/reset
 * @desc    Reset section to default content
 * @access  Super Admin
 */
router.post('/admin/landing-content/:section/reset',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  resetSectionContent
);

/**
 * @route   POST /api/admin/landing-content/initialize
 * @desc    Initialize default content
 * @access  Super Admin
 */
router.post('/admin/landing-content/initialize',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  initializeDefaults
);

export default router;