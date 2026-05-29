import reportService from '../services/report.service.js';
import exportService from '../services/export.service.js';
import { REPORT_TYPES, FILE_FORMATS } from '../models/Report.js';

class ReportController {
  /**
   * Create a new report
   * POST /api/reports
   */
  async createReport(req, res) {
    try {
      const { organization } = req.user;
      const userId = req.user._id;

      const report = await reportService.createReport(organization, userId, req.body);

      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Create report from template
   * POST /api/reports/from-template/:templateId
   */
  async createFromTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const userId = req.user._id;

      const report = await reportService.createFromTemplate(templateId, userId, req.body);

      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get all reports
   * GET /api/reports
   */
  async getReports(req, res) {
    try {
      const { organization } = req.user;
      const {
        type,
        status,
        isTemplate,
        search,
        page = 1,
        limit = 20,
        sort = '-createdAt'
      } = req.query;

      const result = await reportService.listReports(organization, {
        type,
        status,
        isTemplate: isTemplate === 'true',
        search,
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      });

      res.json({
        success: true,
        data: result.reports,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get report by ID
   * GET /api/reports/:id
   */
  async getReport(req, res) {
    try {
      const { organization } = req.user;
      const { id } = req.params;

      const report = await reportService.getReportById(id, organization);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Check access
      if (!report.hasAccess(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update report
   * PUT /api/reports/:id
   */
  async updateReport(req, res) {
    try {
      const { organization } = req.user;
      const { id } = req.params;

      const report = await reportService.updateReport(id, organization, req.body);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete report
   * DELETE /api/reports/:id
   */
  async deleteReport(req, res) {
    try {
      const { organization } = req.user;
      const { id } = req.params;

      const deleted = await reportService.deleteReport(id, organization);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Generate report
   * POST /api/reports/:id/generate
   */
  async generateReport(req, res) {
    try {
      const { id } = req.params;

      const report = await reportService.generateReport(id);

      res.json({
        success: true,
        data: report,
        message: 'Report generated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Export report
   * GET /api/reports/:id/export
   */
  async exportReport(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;

      const supportedFormats = ['json', 'csv', 'excel', 'xlsx', 'pdf'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid format. Supported formats: ${supportedFormats.join(', ')}`
        });
      }

      // Get the report
      const report = await reportService.getReportById(id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      if (report.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Report must be completed before export'
        });
      }

      // Use the export service
      const result = await exportService.exportReport(report, format);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size);
      res.send(result.buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Share report with users
   * POST /api/reports/:id/share
   */
  async shareReport(req, res) {
    try {
      const { id } = req.params;
      const { userIds, permission = 'view' } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds must be a non-empty array'
        });
      }

      const report = await reportService.shareReport(id, userIds, permission);

      res.json({
        success: true,
        data: report,
        message: 'Report shared successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Remove share
   * DELETE /api/reports/:id/share/:userId
   */
  async removeShare(req, res) {
    try {
      const { id, userId } = req.params;

      const report = await reportService.removeShare(id, userId);

      res.json({
        success: true,
        data: report,
        message: 'Share removed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get report templates
   * GET /api/reports/templates
   */
  async getTemplates(req, res) {
    try {
      const { organization } = req.user;

      const templates = await reportService.getTemplates(organization);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Create template
   * POST /api/reports/templates
   */
  async createTemplate(req, res) {
    try {
      const { organization } = req.user;
      const userId = req.user._id;

      const template = await reportService.createTemplate(organization, userId, req.body);

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get available report types
   * GET /api/reports/types
   */
  async getReportTypes(req, res) {
    res.json({
      success: true,
      data: REPORT_TYPES
    });
  }

  /**
   * Get available file formats
   * GET /api/reports/formats
   */
  async getFileFormats(req, res) {
    res.json({
      success: true,
      data: FILE_FORMATS
    });
  }

  /**
   * Get scheduled reports
   * GET /api/reports/scheduled
   */
  async getScheduledReports(req, res) {
    try {
      const { organization } = req.user;

      const result = await reportService.listReports(organization, {
        isTemplate: false,
        status: 'pending'
      });

      // Filter for scheduled reports
      const scheduled = result.reports.filter(
        r => r.schedule && r.schedule.isScheduled
      );

      res.json({
        success: true,
        data: scheduled
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Duplicate report
   * POST /api/reports/:id/duplicate
   */
  async duplicateReport(req, res) {
    try {
      const { organization } = req.user;
      const userId = req.user._id;
      const { id } = req.params;

      const original = await reportService.getReportById(id, organization);

      if (!original) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const duplicated = await reportService.createReport(organization, userId, {
        name: `${original.name} (Copy)`,
        type: original.type,
        description: original.description,
        parameters: original.parameters,
        tags: original.tags
      });

      res.status(201).json({
        success: true,
        data: duplicated,
        message: 'Report duplicated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get report statistics
   * GET /api/reports/stats
   */
  async getReportStats(req, res) {
    try {
      const { organization } = req.user;

      const [
        totalReports,
        completedReports,
        pendingReports,
        failedReports,
        templatesCount
      ] = await Promise.all([
        reportService.listReports(organization, { limit: 1000 }).then(r => r.pagination.total),
        reportService.listReports(organization, { status: 'completed', limit: 1000 }).then(r => r.pagination.total),
        reportService.listReports(organization, { status: 'pending', limit: 1000 }).then(r => r.pagination.total),
        reportService.listReports(organization, { status: 'failed', limit: 1000 }).then(r => r.pagination.total),
        reportService.getTemplates(organization).then(t => t.length)
      ]);

      res.json({
        success: true,
        data: {
          total: totalReports,
          completed: completedReports,
          pending: pendingReports,
          failed: failedReports,
          templates: templatesCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ReportController();