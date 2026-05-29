/**
 * Real-time Routes
 *
 * Routes for real-time features including WebSocket and SSE endpoints.
 */

import { Router } from 'express';
import realtimeController from '../controllers/realtime.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

// ==========================================
// Usage Statistics
// ==========================================

/**
 * @route   GET /api/realtime/usage
 * @desc    Get real-time usage statistics
 * @access  Private (requires view_analytics permission)
 */
router.get('/usage',
  requirePermissions('view_analytics'),
  realtimeController.getUsageStats
);

/**
 * @route   GET /api/realtime/stream
 * @desc    Get live token consumption stream (SSE)
 * @access  Private (requires view_analytics permission)
 */
router.get('/stream',
  requirePermissions('view_analytics'),
  realtimeController.getTokenStream
);

/**
 * @route   GET /api/realtime/dashboard
 * @desc    Get live dashboard metrics
 * @access  Private (requires view_dashboard permission)
 */
router.get('/dashboard',
  requirePermissions('view_dashboard'),
  realtimeController.getDashboardMetrics
);

// ==========================================
// Monitoring Control
// ==========================================

/**
 * @route   POST /api/realtime/monitoring/start
 * @desc    Start real-time monitoring for organization
 * @access  Private (requires manage_settings permission)
 */
router.post('/monitoring/start',
  requirePermissions('manage_settings'),
  validate([
    body('intervalMs')
      .optional()
      .isInt({ min: 5000, max: 300000 })
      .withMessage('Interval must be between 5000ms and 300000ms')
  ]),
  realtimeController.startMonitoring
);

/**
 * @route   POST /api/realtime/monitoring/stop
 * @desc    Stop real-time monitoring for organization
 * @access  Private (requires manage_settings permission)
 */
router.post('/monitoring/stop',
  requirePermissions('manage_settings'),
  realtimeController.stopMonitoring
);

/**
 * @route   GET /api/realtime/stats
 * @desc    Get connection statistics
 * @access  Private (requires manage_settings permission)
 */
router.get('/stats',
  requirePermissions('manage_settings'),
  realtimeController.getConnectionStats
);

// ==========================================
// Feature Live Usage
// ==========================================

/**
 * @route   GET /api/realtime/features/:featureId/usage
 * @desc    Get live feature usage
 * @access  Private (requires view_features permission)
 */
router.get('/features/:featureId/usage',
  requirePermissions('view_features'),
  validate([
    param('featureId')
      .isMongoId()
      .withMessage('Invalid feature ID')
  ]),
  realtimeController.getFeatureLiveUsage
);

// ==========================================
// Admin Endpoints
// ==========================================

/**
 * @route   POST /api/realtime/broadcast
 * @desc    Broadcast event to organization (admin only)
 * @access  Private (requires manage_platform permission)
 */
router.post('/broadcast',
  requirePermissions('manage_platform'),
  validate([
    body('organizationId')
      .isMongoId()
      .withMessage('Invalid organization ID'),
    body('event')
      .notEmpty()
      .withMessage('Event name is required')
      .isLength({ max: 100 })
      .withMessage('Event name cannot exceed 100 characters'),
    body('data')
      .notEmpty()
      .withMessage('Data is required')
  ]),
  realtimeController.broadcastToOrganization
);

export default router;