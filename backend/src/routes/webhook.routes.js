/**
 * Webhook Routes
 *
 * Routes for webhook management endpoints.
 * FR-46: Webhook Configurations
 */

import { Router } from 'express';
import webhookController from '../controllers/webhook.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/webhooks/events
 * @desc    Get available webhook events
 * @access  Private
 */
router.get('/events',
  webhookController.getAvailableEvents
);

/**
 * @route   POST /api/webhooks
 * @desc    Create a new webhook
 * @access  Private (requires manage_webhooks permission)
 */
router.post('/',
  requirePermissions('manage_webhooks'),
  webhookController.create
);

/**
 * @route   GET /api/webhooks
 * @desc    Get all webhooks for organization
 * @access  Private (requires view_webhooks permission)
 */
router.get('/',
  requirePermissions('view_webhooks'),
  webhookController.getForOrganization
);

/**
 * @route   GET /api/webhooks/:id
 * @desc    Get webhook by ID
 * @access  Private (requires view_webhooks permission)
 */
router.get('/:id',
  requirePermissions('view_webhooks'),
  webhookController.getById
);

/**
 * @route   GET /api/webhooks/:id/history
 * @desc    Get webhook delivery history
 * @access  Private (requires view_webhooks permission)
 */
router.get('/:id/history',
  requirePermissions('view_webhooks'),
  webhookController.getDeliveryHistory
);

/**
 * @route   PUT /api/webhooks/:id
 * @desc    Update webhook
 * @access  Private (requires manage_webhooks permission)
 */
router.put('/:id',
  requirePermissions('manage_webhooks'),
  webhookController.update
);

/**
 * @route   DELETE /api/webhooks/:id
 * @desc    Delete webhook
 * @access  Private (requires manage_webhooks permission)
 */
router.delete('/:id',
  requirePermissions('manage_webhooks'),
  webhookController.delete
);

/**
 * @route   POST /api/webhooks/:id/test
 * @desc    Test webhook
 * @access  Private (requires manage_webhooks permission)
 */
router.post('/:id/test',
  requirePermissions('manage_webhooks'),
  webhookController.test
);

/**
 * @route   PUT /api/webhooks/:id/status
 * @desc    Toggle webhook status
 * @access  Private (requires manage_webhooks permission)
 */
router.put('/:id/status',
  requirePermissions('manage_webhooks'),
  webhookController.toggleStatus
);

/**
 * @route   POST /api/webhooks/:id/regenerate-secret
 * @desc    Regenerate webhook secret
 * @access  Private (requires manage_webhooks permission)
 */
router.post('/:id/regenerate-secret',
  requirePermissions('manage_webhooks'),
  webhookController.regenerateSecret
);

export default router;