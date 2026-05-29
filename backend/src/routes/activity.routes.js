/**
 * Activity Routes
 *
 * Routes for activity tracking and session management.
 */

import { Router } from 'express';
import activityController from '../controllers/activity.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { query, param } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route GET /api/activity/history
 * @description Get user activity history
 * @access Private
 */
router.get(
  '/history',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
    query('type').optional().isString().withMessage('Type must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    validate
  ],
  activityController.getActivityHistory
);

/**
 * @route GET /api/activity/recent-logins
 * @description Get recent login history
 * @access Private
 */
router.get(
  '/recent-logins',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    validate
  ],
  activityController.getRecentLogins
);

/**
 * @route GET /api/activity/statistics
 * @description Get activity statistics
 * @access Private
 */
router.get(
  '/statistics',
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    validate
  ],
  activityController.getActivityStatistics
);

/**
 * @route GET /api/activity/sessions
 * @description Get active sessions
 * @access Private
 */
router.get('/sessions', activityController.getActiveSessions);

/**
 * @route GET /api/activity/sessions/statistics
 * @description Get session statistics
 * @access Private
 */
router.get('/sessions/statistics', activityController.getSessionStatistics);

/**
 * @route DELETE /api/activity/sessions/:sessionId
 * @description Revoke a specific session
 * @access Private
 */
router.delete(
  '/sessions/:sessionId',
  [
    param('sessionId').isString().withMessage('Session ID must be a string'),
    validate
  ],
  activityController.revokeSession
);

/**
 * @route POST /api/activity/sessions/revoke-others
 * @description Revoke all other sessions
 * @access Private
 */
router.post('/sessions/revoke-others', activityController.revokeOtherSessions);

/**
 * @route GET /api/activity/organization
 * @description Get organization activity (admin/org_owner only)
 * @access Private (requires org_owner role)
 */
router.get(
  '/organization',
  restrictTo('org_owner', 'admin'),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be a non-negative integer'),
    validate
  ],
  activityController.getOrganizationActivity
);

export default router;