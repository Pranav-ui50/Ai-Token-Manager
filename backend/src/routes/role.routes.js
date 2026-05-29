/**
 * Role Routes
 *
 * Routes for role management.
 */

import express from 'express';
import roleController from '../controllers/role.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/', roleController.getAll);

/**
 * @route   GET /api/roles/organization
 * @desc    Get organization-specific roles
 * @access  Private
 */
router.get('/organization', roleController.getOrganizationRoles);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role by ID
 * @access  Private
 */
router.get('/:id', roleController.getById);

export default router;