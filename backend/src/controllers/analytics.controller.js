/**
 * Analytics Controller
 *
 * Handles HTTP requests for analytics endpoints.
 * FR-40: Operational cost dashboards
 * FR-41: Feature profitability analytics
 * FR-42: Exportable reports
 * FR-43: Excel/PDF exports
 * FR-44: Margin analytics
 */

import analyticsService from '../services/analytics.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class AnalyticsController {
  /**
   * Get dashboard summary
   * FR-40: Operational cost dashboard overview
   * @route GET /api/analytics/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      logger.info(`[AnalyticsController] getDashboard called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;

      // Return empty dashboard data if no organization
      if (!organizationId) {
        return res.status(200).json({
          success: true,
          data: {
            summary: {
              totalTokens: 0,
              totalRequests: 0,
              tokensThisMonth: 0,
              requestsThisMonth: 0,
              tokensToday: 0,
              requestsToday: 0,
              avgTokensPerRequest: 0,
              errorRate: 0
            },
            modelUsage: [],
            featureUsage: [],
            recentActivity: []
          }
        });
      }

      const data = await analyticsService.getDashboard(organizationId);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error(`[AnalyticsController] getDashboard error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get operational costs
   * FR-40: Detailed cost analytics
   * @route GET /api/analytics/costs
   */
  async getOperationalCosts(req, res, next) {
    try {
      logger.info(`[AnalyticsController] getOperationalCosts called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;

      // Return empty data if no organization
      if (!organizationId) {
        return res.status(200).json({
          success: true,
          data: {
            costs: [],
            totalCost: 0,
            breakdown: {}
          }
        });
      }

      const { startDate, endDate, projectId } = req.query;

      const filters = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (projectId) filters.projectId = projectId;

      const data = await analyticsService.getOperationalCosts(organizationId, filters);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error(`[AnalyticsController] getOperationalCosts error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get feature profitability
   * FR-41: Feature profitability analytics
   * @route GET /api/analytics/profitability
   */
  async getFeatureProfitability(req, res, next) {
    try {
      logger.info(`[AnalyticsController] getFeatureProfitability called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;

      // Return empty data if no organization
      if (!organizationId) {
        return res.status(200).json({
          success: true,
          data: {
            features: [],
            totalProfitability: 0
          }
        });
      }

      const { projectId } = req.query;

      const filters = {};
      if (projectId) filters.projectId = projectId;

      const data = await analyticsService.getFeatureProfitability(organizationId, filters);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error(`[AnalyticsController] getFeatureProfitability error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get margin analytics
   * FR-44: Margin analytics
   * @route GET /api/analytics/margins
   */
  async getMargins(req, res, next) {
    try {
      logger.info(`[AnalyticsController] getMargins called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;

      // Return empty data if no organization
      if (!organizationId) {
        return res.status(200).json({
          success: true,
          data: {
            margins: [],
            averageMargin: 0
          }
        });
      }

      const { projectId } = req.query;

      const filters = {};
      if (projectId) filters.projectId = projectId;

      const data = await analyticsService.getMarginAnalytics(organizationId, filters);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error(`[AnalyticsController] getMargins error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Export report
   * FR-42 & FR-43: Exportable reports (JSON, Excel, PDF)
   * @route GET /api/analytics/export
   */
  async exportReport(req, res, next) {
    try {
      logger.info(`[AnalyticsController] exportReport called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;

      // Return empty data if no organization
      if (!organizationId) {
        return res.status(200).json({
          success: true,
          data: {
            reportType: req.query.reportType || 'summary',
            generatedAt: new Date().toISOString(),
            data: []
          }
        });
      }

      const { reportType = 'summary', format = 'json', projectId, startDate, endDate } = req.query;

      // Validate report type
      const validReportTypes = ['costs', 'profitability', 'margins', 'summary'];
      if (!validReportTypes.includes(reportType)) {
        throw new AppError(
          `Invalid report type. Valid types: ${validReportTypes.join(', ')}`,
          400,
          'INVALID_REPORT_TYPE'
        );
      }

      // Validate format
      const validFormats = ['json', 'excel', 'pdf'];
      if (!validFormats.includes(format)) {
        throw new AppError(
          `Invalid format. Valid formats: ${validFormats.join(', ')}`,
          400,
          'INVALID_FORMAT'
        );
      }

      const filters = {};
      if (projectId) filters.projectId = projectId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const data = await analyticsService.generateReport(organizationId, reportType, format, filters);

      // Set appropriate headers based on format
      if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.xlsx"`);
        return res.send(data);
      }

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.pdf"`);
        return res.send(data);
      }

      // JSON format
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error(`[AnalyticsController] exportReport error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Generate custom report
   * FR-42 & FR-43: Custom report generation
   * @route POST /api/analytics/export/custom
   */
  async generateCustomReport(req, res, next) {
    try {
      logger.info(`[AnalyticsController] generateCustomReport called by user: ${req.user?.id}`);

      const organizationId = req.user.organization;

      // Return empty data if no organization
      if (!organizationId) {
        return res.status(200).json({
          success: true,
          data: {
            reports: {},
            generatedAt: new Date().toISOString()
          }
        });
      }

      const {
        reportTypes = ['summary'],
        format = 'json',
        filters = {}
      } = req.body;

      // Validate report types
      const validReportTypes = ['costs', 'profitability', 'margins', 'summary'];
      for (const type of reportTypes) {
        if (!validReportTypes.includes(type)) {
          throw new AppError(
            `Invalid report type: ${type}. Valid types: ${validReportTypes.join(', ')}`,
            400,
            'INVALID_REPORT_TYPE'
          );
        }
      }

      // Validate format
      const validFormats = ['json', 'excel', 'pdf'];
      if (!validFormats.includes(format)) {
        throw new AppError(
          `Invalid format. Valid formats: ${validFormats.join(', ')}`,
          400,
          'INVALID_FORMAT'
        );
      }

      // Generate reports for each type
      const reports = {};
      for (const reportType of reportTypes) {
        reports[reportType] = await analyticsService.generateReport(
          organizationId,
          reportType,
          format,
          filters
        );
      }

      // For multiple reports, combine into summary
      let data;
      if (reportTypes.length === 1) {
        data = reports[reportTypes[0]];
      } else {
        data = {
          reports,
          generatedAt: new Date().toISOString()
        };
      }

      // Set appropriate headers based on format
      if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="custom-report-${Date.now()}.xlsx"`);
        return res.send(data);
      }

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="custom-report-${Date.now()}.pdf"`);
        return res.send(data);
      }

      // JSON format
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error(`[AnalyticsController] generateCustomReport error: ${error.message}`);
      next(error);
    }
  }
}

export default new AnalyticsController();