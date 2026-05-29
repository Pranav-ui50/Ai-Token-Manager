/**
 * Admin Routes
 *
 * Routes for super admin operations.
 */

import express from 'express';
import adminController from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication and super admin role
router.use(protect);
router.use(restrictTo('superadmin'));

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics
 * @access  Private (Super Admin)
 */
router.get('/stats', adminController.getSystemStats);

/**
 * @route   GET /api/admin/organizations
 * @desc    Get all organizations with filtering
 * @access  Private (Super Admin)
 */
router.get('/organizations', adminController.getOrganizations);

/**
 * @route   POST /api/admin/organizations
 * @desc    Create new organization
 * @access  Private (Super Admin)
 */
router.post('/organizations', adminController.createOrganization);

/**
 * @route   GET /api/admin/organizations/:id
 * @desc    Get organization by ID with details
 * @access  Private (Super Admin)
 */
router.get('/organizations/:id', adminController.getOrganizationById);

/**
 * @route   PATCH /api/admin/organizations/:id/status
 * @desc    Update organization status
 * @access  Private (Super Admin)
 */
router.patch('/organizations/:id/status', adminController.updateOrganizationStatus);

/**
 * @route   PATCH /api/admin/organizations/:id/plan
 * @desc    Update organization plan
 * @access  Private (Super Admin)
 */
router.patch('/organizations/:id/plan', adminController.updateOrganizationPlan);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering
 * @access  Private (Super Admin)
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/admin/providers
 * @desc    Get all providers
 * @access  Private (Super Admin)
 */
router.get('/providers', adminController.getProviders);

/**
 * @route   POST /api/admin/providers
 * @desc    Create new provider
 * @access  Private (Super Admin)
 */
router.post('/providers', adminController.createProvider);

/**
 * @route   GET /api/admin/providers/:id
 * @desc    Get provider by ID with models
 * @access  Private (Super Admin)
 */
router.get('/providers/:id', adminController.getProviderById);

/**
 * @route   PUT /api/admin/providers/:id
 * @desc    Update provider
 * @access  Private (Super Admin)
 */
router.put('/providers/:id', adminController.updateProvider);

/**
 * @route   DELETE /api/admin/providers/:id
 * @desc    Delete provider
 * @access  Private (Super Admin)
 */
router.delete('/providers/:id', adminController.deleteProvider);

/**
 * @route   PATCH /api/admin/providers/:id/status
 * @desc    Toggle provider status
 * @access  Private (Super Admin)
 */
router.patch('/providers/:id/status', adminController.toggleProviderStatus);

/**
 * @route   GET /api/admin/models
 * @desc    Get all models with filtering
 * @access  Private (Super Admin)
 */
router.get('/models', adminController.getModels);

/**
 * @route   POST /api/admin/models
 * @desc    Create new model
 * @access  Private (Super Admin)
 */
router.post('/models', adminController.createModel);

/**
 * @route   GET /api/admin/models/:id
 * @desc    Get model by ID
 * @access  Private (Super Admin)
 */
router.get('/models/:id', adminController.getModelById);

/**
 * @route   PUT /api/admin/models/:id
 * @desc    Update model
 * @access  Private (Super Admin)
 */
router.put('/models/:id', adminController.updateModel);

/**
 * @route   DELETE /api/admin/models/:id
 * @desc    Delete model
 * @access  Private (Super Admin)
 */
router.delete('/models/:id', adminController.deleteModel);

/**
 * @route   PATCH /api/admin/models/:id/status
 * @desc    Toggle model status
 * @access  Private (Super Admin)
 */
router.patch('/models/:id/status', adminController.toggleModelStatus);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Super Admin)
 */
router.get('/dashboard', adminController.getDashboardStats);

export default router;