/**
 * Project Routes
 *
 * Routes for project management.
 */

import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import { protect, requirePermissions, checkOrganization } from '../middlewares/auth.middleware.js';
import { projectValidator } from '../validators/project.validator.js';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private (requires manage_features permission)
 */
router.post('/',
  requirePermissions('manage_features'),
  projectValidator.create,
  projectController.create
);

/**
 * @route   GET /api/projects/organization/:organizationId
 * @desc    Get all projects for an organization
 * @access  Private (requires view_features permission)
 */
router.get('/organization/:organizationId',
  requirePermissions('view_features'),
  checkOrganization('organizationId'),
  projectController.getForOrganization
);

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Private (requires view_features permission)
 */
router.get('/:id',
  requirePermissions('view_features'),
  projectController.getById
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (requires manage_features permission)
 */
router.put('/:id',
  requirePermissions('manage_features'),
  projectValidator.update,
  projectController.update
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (requires manage_features permission)
 */
router.delete('/:id',
  requirePermissions('manage_features'),
  projectController.delete
);

/**
 * @route   GET /api/projects/:id/stats
 * @desc    Get project statistics
 * @access  Private (requires view_features permission)
 */
router.get('/:id/stats',
  requirePermissions('view_features'),
  projectController.getStats
);

/**
 * @route   PUT /api/projects/:id/archive
 * @desc    Archive project
 * @access  Private (requires manage_features permission)
 */
router.put('/:id/archive',
  requirePermissions('manage_features'),
  projectController.archive
);

/**
 * @route   PUT /api/projects/:id/restore
 * @desc    Restore archived project
 * @access  Private (requires manage_features permission)
 */
router.put('/:id/restore',
  requirePermissions('manage_features'),
  projectController.restore
);

// ==========================================
// Project Member Routes
// ==========================================

/**
 * @route   GET /api/projects/:id/members
 * @desc    Get project members
 * @access  Private (requires view_features permission)
 */
router.get('/:id/members',
  requirePermissions('view_features'),
  projectController.getMembers
);

/**
 * @route   POST /api/projects/:id/members
 * @desc    Add member to project
 * @access  Private (requires manage_features permission)
 */
router.post('/:id/members',
  requirePermissions('manage_features'),
  projectController.addMember
);

/**
 * @route   PUT /api/projects/:id/members/:memberId/role
 * @desc    Update member role
 * @access  Private (requires manage_features permission)
 */
router.put('/:id/members/:memberId/role',
  requirePermissions('manage_features'),
  projectController.updateMemberRole
);

/**
 * @route   DELETE /api/projects/:id/members/:memberId
 * @desc    Remove member from project
 * @access  Private (requires manage_features permission)
 */
router.delete('/:id/members/:memberId',
  requirePermissions('manage_features'),
  projectController.removeMember
);

export default router;