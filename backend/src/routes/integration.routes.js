/**
 * Integration Routes
 *
 * Routes for integration management endpoints.
 * FR-45: API Integrations
 * FR-47: Usage Synchronization
 */

import { Router } from 'express';
import integrationController from '../controllers/integration.controller.js';
import { protect, requirePermissions, checkOrganization } from '../middlewares/auth.middleware.js';
import { verifyWebhookSignature } from '../middlewares/webhookVerify.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

// ==========================================
// Sync Statistics (must be before /:id routes)
// ==========================================

/**
 * @route   GET /api/integrations/sync/stats
 * @desc    Get sync statistics for organization
 * @access  Private (requires view_integrations permission)
 */
router.get('/sync/stats',
  requirePermissions('view_integrations'),
  integrationController.getSyncStats
);

// ==========================================
// Integration CRUD Routes
// ==========================================

/**
 * @route   POST /api/integrations
 * @desc    Create a new integration
 * @access  Private (requires manage_integrations permission)
 */
router.post('/',
  requirePermissions('manage_integrations'),
  integrationController.create
);

/**
 * @route   GET /api/integrations
 * @desc    Get all integrations for organization
 * @access  Private (requires view_integrations permission)
 */
router.get('/',
  requirePermissions('view_integrations'),
  integrationController.getForOrganization
);

/**
 * @route   GET /api/integrations/:id
 * @desc    Get integration by ID
 * @access  Private (requires view_integrations permission)
 */
router.get('/:id',
  requirePermissions('view_integrations'),
  integrationController.getById
);

/**
 * @route   PUT /api/integrations/:id
 * @desc    Update integration
 * @access  Private (requires manage_integrations permission)
 */
router.put('/:id',
  requirePermissions('manage_integrations'),
  integrationController.update
);

/**
 * @route   DELETE /api/integrations/:id
 * @desc    Delete integration
 * @access  Private (requires manage_integrations permission)
 */
router.delete('/:id',
  requirePermissions('manage_integrations'),
  integrationController.delete
);

// ==========================================
// Integration Connection & Sync
// ==========================================

/**
 * @route   POST /api/integrations/:id/test
 * @desc    Test integration connection
 * @access  Private (requires manage_integrations permission)
 */
router.post('/:id/test',
  requirePermissions('manage_integrations'),
  integrationController.testConnection
);

/**
 * @route   POST /api/integrations/:id/sync
 * @desc    Legacy sync endpoint (redirects to startSync)
 * @access  Private (requires manage_integrations permission)
 */
router.post('/:id/sync',
  requirePermissions('manage_integrations'),
  integrationController.sync
);

/**
 * @route   PUT /api/integrations/:id/status
 * @desc    Toggle integration status
 * @access  Private (requires manage_integrations permission)
 */
router.put('/:id/status',
  requirePermissions('manage_integrations'),
  integrationController.toggleStatus
);

// ==========================================
// FR-47: Usage Synchronization Routes
// ==========================================

/**
 * @route   POST /api/integrations/:id/sync/start
 * @desc    Start a manual sync
 * @access  Private (requires manage_integrations permission)
 */
router.post('/:id/sync/start',
  requirePermissions('manage_integrations'),
  integrationController.startSync
);

/**
 * @route   GET /api/integrations/:id/sync/status
 * @desc    Get last sync status
 * @access  Private (requires view_integrations permission)
 */
router.get('/:id/sync/status',
  requirePermissions('view_integrations'),
  integrationController.getSyncStatus
);

/**
 * @route   GET /api/integrations/:id/sync/history
 * @desc    Get sync history
 * @access  Private (requires view_integrations permission)
 */
router.get('/:id/sync/history',
  requirePermissions('view_integrations'),
  integrationController.getSyncHistory
);

/**
 * @route   PUT /api/integrations/:id/sync/settings
 * @desc    Update sync settings (enable/disable, interval)
 * @access  Private (requires manage_integrations permission)
 */
router.put('/:id/sync/settings',
  requirePermissions('manage_integrations'),
  integrationController.updateSyncSettings
);

/**
 * @route   POST /api/integrations/:id/sync/:syncId/cancel
 * @desc    Cancel a running sync
 * @access  Private (requires manage_integrations permission)
 */
router.post('/:id/sync/:syncId/cancel',
  requirePermissions('manage_integrations'),
  integrationController.cancelSync
);

/**
 * @route   POST /api/integrations/:id/sync/:syncId/retry
 * @desc    Retry a failed sync
 * @access  Private (requires manage_integrations permission)
 */
router.post('/:id/sync/:syncId/retry',
  requirePermissions('manage_integrations'),
  integrationController.retrySync
);

// ==========================================
// Webhook Endpoints (Public)
// ==========================================

/**
 * @route   POST /api/integrations/:id/webhook
 * @desc    Handle webhook event from external provider
 * @access  Public (validated by signature)
 * @note    Signature verification is done in the controller based on integration type
 */
router.post('/:id/webhook',
  // Webhook signature verification is handled in controller
  // as it needs to look up the integration first
  integrationController.handleWebhook
);

export default router;