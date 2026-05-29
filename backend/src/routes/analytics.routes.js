/**
 * Analytics Routes
 *
 * Routes for analytics and reporting endpoints.
 * FR-40: Operational cost dashboards
 * FR-41: Feature profitability analytics
 * FR-42: Exportable reports
 * FR-43: Excel/PDF exports
 * FR-44: Margin analytics
 */

import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller.js';
import { protect, requirePermissions } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard summary (FR-40)
 * @access  Private (requires view_analytics permission)
 */
router.get('/dashboard',
  requirePermissions('view_features'),
  analyticsController.getDashboard
);

/**
 * @route   GET /api/analytics/costs
 * @desc    Get operational costs breakdown (FR-40)
 * @query   {string} startDate - Filter by start date
 * @query   {string} endDate - Filter by end date
 * @query   {string} projectId - Filter by project
 * @access  Private (requires view_analytics permission)
 */
router.get('/costs',
  requirePermissions('view_features'),
  analyticsController.getOperationalCosts
);

/**
 * @route   GET /api/analytics/profitability
 * @desc    Get feature profitability analytics (FR-41)
 * @query   {string} projectId - Filter by project
 * @access  Private (requires view_analytics permission)
 */
router.get('/profitability',
  requirePermissions('view_features'),
  analyticsController.getFeatureProfitability
);

/**
 * @route   GET /api/analytics/margins
 * @desc    Get margin analytics (FR-44)
 * @query   {string} projectId - Filter by project
 * @access  Private (requires view_analytics permission)
 */
router.get('/margins',
  requirePermissions('view_features'),
  analyticsController.getMargins
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics report (FR-42, FR-43)
 * @query   {string} reportType - Type: costs, profitability, margins, summary
 * @query   {string} format - Format: json, excel, pdf
 * @query   {string} projectId - Filter by project
 * @query   {string} startDate - Filter by start date
 * @query   {string} endDate - Filter by end date
 * @access  Private (requires view_analytics permission)
 */
router.get('/export',
  requirePermissions('view_features'),
  analyticsController.exportReport
);

/**
 * @route   POST /api/analytics/export/custom
 * @desc    Generate custom report with multiple sections (FR-42, FR-43)
 * @body    {Array} reportTypes - Types: costs, profitability, margins, summary
 * @body    {string} format - Format: json, excel, pdf
 * @body    {Object} filters - Filter options
 * @access  Private (requires view_analytics permission)
 */
router.post('/export/custom',
  requirePermissions('view_features'),
  analyticsController.generateCustomReport
);

export default router;