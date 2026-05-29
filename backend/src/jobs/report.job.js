/**
 * Report Job Processor
 *
 * Processes report generation jobs from the report queue.
 */

import logger from '../config/logger.js';
import Report from '../models/Report.js';
import reportService from '../services/report.service.js';

/**
 * Report types
 */
const REPORT_TYPES = {
  COST_ANALYSIS: 'cost_analysis',
  MARGIN_ANALYSIS: 'margin_analysis',
  PROFITABILITY: 'profitability',
  USAGE_SUMMARY: 'usage_summary',
  PROVIDER_COMPARISON: 'provider_comparison',
  FEATURE_ANALYTICS: 'feature_analytics',
  CUSTOM: 'custom'
};

/**
 * Output formats
 */
const OUTPUT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json'
};

/**
 * Process report generation job
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>}
 */
async function processReportJob(data, job) {
  const {
    reportId,
    organizationId,
    userId,
    type,
    format = OUTPUT_FORMATS.PDF,
    parameters = {},
    options = {}
  } = data;

  logger.info(`Processing report job: ${type} for organization ${organizationId}`);

  try {
    // Update report status to processing
    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: 'processing',
        startedAt: new Date()
      });
    }

    // Update job progress
    if (job) {
      job.progress(10);
    }

    let result;

    switch (type) {
      case REPORT_TYPES.COST_ANALYSIS:
        result = await reportService.generateCostAnalysis(organizationId, parameters);
        break;

      case REPORT_TYPES.MARGIN_ANALYSIS:
        result = await reportService.generateMarginAnalysis(organizationId, parameters);
        break;

      case REPORT_TYPES.PROFITABILITY:
        result = await reportService.generateProfitabilityReport(organizationId, parameters);
        break;

      case REPORT_TYPES.USAGE_SUMMARY:
        result = await reportService.generateUsageSummary(organizationId, parameters);
        break;

      case REPORT_TYPES.PROVIDER_COMPARISON:
        result = await reportService.generateProviderComparison(organizationId, parameters);
        break;

      case REPORT_TYPES.FEATURE_ANALYTICS:
        result = await reportService.generateFeatureAnalytics(organizationId, parameters);
        break;

      case REPORT_TYPES.CUSTOM:
        result = await reportService.generateCustomReport(organizationId, parameters);
        break;

      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    // Update job progress
    if (job) {
      job.progress(70);
    }

    // Export to requested format
    let fileUrl = null;
    let fileData = null;

    switch (format) {
      case OUTPUT_FORMATS.PDF:
        fileData = await reportService.exportToPdf(result);
        fileUrl = await reportService.saveReportFile(reportId, fileData, 'pdf');
        break;

      case OUTPUT_FORMATS.EXCEL:
        fileData = await reportService.exportToExcel(result);
        fileUrl = await reportService.saveReportFile(reportId, fileData, 'xlsx');
        break;

      case OUTPUT_FORMATS.CSV:
        fileData = await reportService.exportToCsv(result);
        fileUrl = await reportService.saveReportFile(reportId, fileData, 'csv');
        break;

      case OUTPUT_FORMATS.JSON:
        fileData = JSON.stringify(result, null, 2);
        fileUrl = await reportService.saveReportFile(reportId, fileData, 'json');
        break;
    }

    // Update job progress
    if (job) {
      job.progress(90);
    }

    // Update report status to completed
    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: 'completed',
        completedAt: new Date(),
        fileUrl,
        data: result
      });
    }

    logger.info(`Report job completed: ${type} for organization ${organizationId}`);

    return {
      success: true,
      reportId,
      fileUrl,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Report job failed: ${type}`, error.message);

    // Update report status to failed
    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: 'failed',
        failedAt: new Date(),
        error: error.message
      });
    }

    throw error;
  }
}

/**
 * Register report processor with queue service
 * @param {Object} queueService - Queue service instance
 */
async function register(queueService) {
  await queueService.registerProcessor('report', processReportJob, 2);
  logger.info('Report job processor registered');
}

export default {
  process: processReportJob,
  register,
  REPORT_TYPES,
  OUTPUT_FORMATS
};