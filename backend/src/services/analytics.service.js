/**
 * Analytics Service
 *
 * Handles analytics and reporting business logic.
 * FR-40: Operational cost dashboards
 * FR-41: Feature profitability analytics
 * FR-42: Exportable reports
 * FR-43: Excel/PDF exports
 * FR-44: Margin analytics
 */

import mongoose from 'mongoose';
import { createRequire } from 'module';
import Feature from '../models/Feature.js';
import Project from '../models/Project.js';
import Organization from '../models/Organization.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');

// Try to load PDFKit, fallback if not available
let PDFDocument = null;
try {
  PDFDocument = require('pdfkit').default;
} catch (e) {
  logger.warn('[AnalyticsService] PDFKit not installed - PDF generation will use fallback');
}

class AnalyticsService {
  /**
   * FR-40: Get operational cost dashboard data
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Dashboard data with costs, trends, and breakdowns
   */
  async getOperationalCosts(organizationId, filters = {}) {
    const { startDate, endDate, projectId } = filters;

    // Build match query
    const matchQuery = { organization: organizationId };
    if (projectId) {
      matchQuery.project = projectId;
    }

    // Get features with aggregated stats
    const features = await Feature.find(matchQuery)
      .populate('model', 'name displayName pricing type')
      .populate('provider', 'name slug')
      .lean();

    // Calculate total costs
    let totalCost = 0;
    let totalTokens = 0;
    let totalRequests = 0;
    const costsByModel = {};
    const costsByProvider = {};
    const costsByProject = {};
    const costTrend = {};

    for (const feature of features) {
      const featureCost = feature.stats?.totalCost || 0;
      const featureTokens = feature.stats?.totalTokens || 0;
      const featureRequests = feature.stats?.totalRequests || 0;

      totalCost += featureCost;
      totalTokens += featureTokens;
      totalRequests += featureRequests;

      // Infrastructure costs
      const infraCost = this._calculateInfrastructureCost(feature);
      totalCost += infraCost;

      // Group by model
      const modelName = feature.model?.displayName || feature.model?.name || 'Unknown';
      if (!costsByModel[modelName]) {
        costsByModel[modelName] = { cost: 0, tokens: 0, requests: 0 };
      }
      costsByModel[modelName].cost += featureCost + infraCost;
      costsByModel[modelName].tokens += featureTokens;
      costsByModel[modelName].requests += featureRequests;

      // Group by provider
      const providerName = feature.provider?.name || 'Unknown';
      if (!costsByProvider[providerName]) {
        costsByProvider[providerName] = { cost: 0, tokens: 0, requests: 0 };
      }
      costsByProvider[providerName].cost += featureCost + infraCost;
      costsByProvider[providerName].tokens += featureTokens;
      costsByProvider[providerName].requests += featureRequests;

      // Group by project if applicable
      if (feature.project) {
        const projectIdStr = feature.project.toString();
        if (!costsByProject[projectIdStr]) {
          costsByProject[projectIdStr] = { cost: 0, tokens: 0, requests: 0 };
        }
        costsByProject[projectIdStr].cost += featureCost + infraCost;
        costsByProject[projectIdStr].tokens += featureTokens;
        costsByProject[projectIdStr].requests += featureRequests;
      }
    }

    // Get cost trend (last 30 days)
    const trendData = await this._getCostTrend(organizationId, 30);

    // Get top cost features
    const topCostFeatures = features
      .map(f => ({
        name: f.name,
        cost: (f.stats?.totalCost || 0) + this._calculateInfrastructureCost(f),
        tokens: f.stats?.totalTokens || 0,
        requests: f.stats?.totalRequests || 0
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      summary: {
        totalCost,
        totalTokens,
        totalRequests,
        featureCount: features.length,
        activeFeatures: features.filter(f => f.status === 'active').length
      },
      costsByModel: Object.entries(costsByModel)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.cost - a.cost),
      costsByProvider: Object.entries(costsByProvider)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.cost - a.cost),
      costsByProject: Object.entries(costsByProject)
        .map(([id, data]) => ({ projectId: id, ...data })),
      topCostFeatures,
      costTrend: trendData,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    };
  }

  /**
   * FR-41: Get feature profitability analytics
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Profitability data per feature
   */
  async getFeatureProfitability(organizationId, filters = {}) {
    const { projectId } = filters;

    // Build match query
    const matchQuery = { organization: organizationId };
    if (projectId) {
      matchQuery.project = projectId;
    }

    const features = await Feature.find(matchQuery)
      .populate('model', 'name displayName pricing type')
      .populate('provider', 'name slug')
      .lean();

    // Get organization settings for revenue estimation
    const organization = await Organization.findById(organizationId);
    const defaultCurrency = organization?.settings?.currency || 'USD';

    const profitabilityData = [];
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    for (const feature of features) {
      // Calculate costs
      const tokenCost = feature.stats?.totalCost || 0;
      const infraCost = this._calculateInfrastructureCost(feature);
      const totalFeatureCost = tokenCost + infraCost;

      // Estimate revenue (based on token usage and estimated pricing)
      // In a real system, this would come from subscription/usage data
      const estimatedRevenue = this._estimateRevenue(feature, tokenCost);
      const profit = estimatedRevenue - totalFeatureCost;
      const margin = estimatedRevenue > 0 ? (profit / estimatedRevenue) * 100 : 0;

      totalRevenue += estimatedRevenue;
      totalCosts += totalFeatureCost;
      totalProfit += profit;

      profitabilityData.push({
        featureId: feature._id,
        featureName: feature.name,
        category: feature.category,
        status: feature.status,
        costs: {
          tokenCost,
          infrastructureCost: infraCost,
          totalCost: totalFeatureCost
        },
        revenue: estimatedRevenue,
        profit,
        margin: margin.toFixed(2),
        requests: feature.stats?.totalRequests || 0,
        tokens: feature.stats?.totalTokens || 0,
        model: feature.model?.displayName || feature.model?.name,
        provider: feature.provider?.name
      });
    }

    // Sort by profitability
    const sortedByProfit = [...profitabilityData].sort((a, b) => b.profit - a.profit);
    const sortedByMargin = [...profitabilityData].sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin));

    return {
      summary: {
        totalRevenue,
        totalCosts,
        totalProfit,
        overallMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
        featureCount: features.length
      },
      features: profitabilityData,
      topPerformers: sortedByProfit.slice(0, 5),
      bottomPerformers: sortedByProfit.slice(-5).reverse(),
      highestMargin: sortedByMargin.slice(0, 5),
      lowestMargin: sortedByMargin.slice(-5).reverse()
    };
  }

  /**
   * FR-44: Get margin analytics
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Margin analytics data
   */
  async getMarginAnalytics(organizationId, filters = {}) {
    const { projectId } = filters;

    // Build match query
    const matchQuery = { organization: organizationId };
    if (projectId) {
      matchQuery.project = projectId;
    }

    const features = await Feature.find(matchQuery)
      .populate('model', 'name displayName pricing type')
      .lean();

    const marginData = [];
    const marginDistribution = {
      negative: 0,
      '0-10': 0,
      '10-25': 0,
      '25-50': 0,
      '50-75': 0,
      '75-100': 0
    };

    for (const feature of features) {
      const tokenCost = feature.stats?.totalCost || 0;
      const infraCost = this._calculateInfrastructureCost(feature);
      const totalCost = tokenCost + infraCost;
      const estimatedRevenue = this._estimateRevenue(feature, tokenCost);
      const profit = estimatedRevenue - totalCost;
      const margin = estimatedRevenue > 0 ? (profit / estimatedRevenue) * 100 : (totalCost > 0 ? -100 : 0);

      // Break-even analysis
      const fixedCosts = (feature.infrastructureCost?.monthlyFixedCost || 0);
      const variableCostPerRequest = totalCost / Math.max(feature.stats?.totalRequests || 1, 1);
      const avgRevenuePerRequest = estimatedRevenue / Math.max(feature.stats?.totalRequests || 1, 1);
      const contributionMargin = avgRevenuePerRequest - variableCostPerRequest;
      const breakEvenRequests = contributionMargin > 0 && fixedCosts > 0
        ? Math.ceil(fixedCosts / contributionMargin)
        : 0;

      marginData.push({
        featureId: feature._id,
        featureName: feature.name,
        grossMargin: margin.toFixed(2),
        netMargin: margin.toFixed(2), // Simplified - same as gross in this model
        profit,
        revenue: estimatedRevenue,
        costs: totalCost,
        breakEven: {
          fixedCosts,
          variableCostPerRequest: variableCostPerRequest.toFixed(4),
          contributionMargin: contributionMargin.toFixed(4),
          breakEvenRequests
        },
        status: feature.status
      });

      // Categorize margin
      if (margin < 0) {
        marginDistribution.negative++;
      } else if (margin <= 10) {
        marginDistribution['0-10']++;
      } else if (margin <= 25) {
        marginDistribution['10-25']++;
      } else if (margin <= 50) {
        marginDistribution['25-50']++;
      } else if (margin <= 75) {
        marginDistribution['50-75']++;
      } else {
        marginDistribution['75-100']++;
      }
    }

    // Calculate aggregates
    const avgMargin = marginData.length > 0
      ? (marginData.reduce((sum, f) => sum + parseFloat(f.grossMargin), 0) / marginData.length).toFixed(2)
      : 0;

    const medianMargin = this._calculateMedian(marginData.map(f => parseFloat(f.grossMargin)));

    return {
      summary: {
        averageMargin: avgMargin,
        medianMargin: medianMargin.toFixed(2),
        totalFeatures: features.length,
        profitableFeatures: marginData.filter(f => parseFloat(f.grossMargin) > 0).length,
        unprofitableFeatures: marginData.filter(f => parseFloat(f.grossMargin) <= 0).length
      },
      marginDistribution: Object.entries(marginDistribution).map(([range, count]) => ({
        range,
        count,
        percentage: ((count / marginData.length) * 100).toFixed(1)
      })),
      features: marginData.sort((a, b) => parseFloat(b.grossMargin) - parseFloat(a.grossMargin)),
      breakEvenAnalysis: {
        featuresNeedingBreakEven: marginData.filter(f => f.breakEven.breakEvenRequests > 0).length,
        averageBreakEvenRequests: marginData.length > 0
          ? Math.round(marginData.reduce((sum, f) => sum + f.breakEven.breakEvenRequests, 0) / marginData.length)
          : 0
      }
    };
  }

  /**
   * FR-42 & FR-43: Generate exportable report
   * @param {string} organizationId - Organization ID
   * @param {string} reportType - Type of report
   * @param {string} format - Export format (json, excel, pdf)
   * @param {Object} filters - Filter options
   * @returns {Object|Buffer} Report data
   */
  async generateReport(organizationId, reportType, format = 'json', filters = {}) {
    let data;

    // Get data based on report type
    switch (reportType) {
      case 'costs':
        data = await this.getOperationalCosts(organizationId, filters);
        break;
      case 'profitability':
        data = await this.getFeatureProfitability(organizationId, filters);
        break;
      case 'margins':
        data = await this.getMarginAnalytics(organizationId, filters);
        break;
      case 'summary':
        data = await this._getSummaryReport(organizationId, filters);
        break;
      default:
        throw new AppError('Invalid report type', 400, 'INVALID_REPORT_TYPE');
    }

    // Return based on format
    switch (format) {
      case 'json':
        return data;
      case 'excel':
        return await this._generateExcelReport(reportType, data);
      case 'pdf':
        return await this._generatePdfReport(reportType, data);
      default:
        return data;
    }
  }

  /**
   * Get dashboard summary for quick overview
   * @param {string} organizationId - Organization ID
   * @returns {Object} Dashboard summary
   */
  async getDashboard(organizationId) {
    // Get organization with projects
    const organization = await Organization.findById(organizationId);
    const projects = await Project.find({ organization: organizationId, isActive: true });
    const features = await Feature.find({ organization: organizationId })
      .populate('model', 'name displayName pricing')
      .populate('provider', 'name')
      .lean();

    // Calculate totals
    const activeFeatures = features.filter(f => f.status === 'active');
    const totalCost = features.reduce((sum, f) => {
      const tokenCost = f.stats?.totalCost || 0;
      const infraCost = this._calculateInfrastructureCost(f);
      return sum + tokenCost + infraCost;
    }, 0);

    const totalTokens = features.reduce((sum, f) => sum + (f.stats?.totalTokens || 0), 0);
    const totalRequests = features.reduce((sum, f) => sum + (f.stats?.totalRequests || 0), 0);

    // Cost by category
    const costByCategory = {};
    for (const feature of features) {
      const category = feature.category || 'other';
      const cost = (feature.stats?.totalCost || 0) + this._calculateInfrastructureCost(feature);
      costByCategory[category] = (costByCategory[category] || 0) + cost;
    }

    // Cost by model
    const costByModel = {};
    for (const feature of features) {
      const modelName = feature.model?.displayName || feature.model?.name || 'Unknown';
      const cost = (feature.stats?.totalCost || 0) + this._calculateInfrastructureCost(feature);
      costByModel[modelName] = (costByModel[modelName] || 0) + cost;
    }

    // Recent activity (features with recent usage)
    const recentFeatures = features
      .filter(f => f.stats?.lastUsedAt)
      .sort((a, b) => new Date(b.stats.lastUsedAt) - new Date(a.stats.lastUsedAt))
      .slice(0, 5)
      .map(f => ({
        name: f.name,
        lastUsed: f.stats.lastUsedAt,
        requests: f.stats.totalRequests
      }));

    // Cost trend (last 7 days)
    const costTrend = await this._getCostTrend(organizationId, 7);

    return {
      summary: {
        organization: {
          name: organization?.name,
          plan: organization?.subscription?.plan
        },
        projects: {
          total: projects.length,
          active: projects.filter(p => p.isActive).length
        },
        features: {
          total: features.length,
          active: activeFeatures.length,
          inactive: features.length - activeFeatures.length
        },
        costs: {
          total: totalCost,
          byCategory: Object.entries(costByCategory)
            .map(([category, cost]) => ({ category, cost }))
            .sort((a, b) => b.cost - a.cost),
          byModel: Object.entries(costByModel)
            .map(([model, cost]) => ({ model, cost }))
            .sort((a, b) => b.cost - a.cost)
        },
        usage: {
          totalTokens,
          totalRequests
        }
      },
      recentActivity: recentFeatures,
      costTrend,
      generatedAt: new Date().toISOString()
    };
  }

  // Private helper methods

  /**
   * Calculate infrastructure cost for a feature
   * @param {Object} feature - Feature document
   * @returns {number} Infrastructure cost
   */
  _calculateInfrastructureCost(feature) {
    const infraCost = feature.infrastructureCost || {};
    const requests = feature.stats?.totalRequests || 0;
    const fixedPerRequest = infraCost.fixedCostPerRequest || 0;
    const overheadPercent = infraCost.overheadPercentage || 0;
    const monthlyFixed = infraCost.monthlyFixedCost || 0;

    const tokenCost = feature.stats?.totalCost || 0;
    const overheadCost = tokenCost * (overheadPercent / 100);

    return (fixedPerRequest * requests) + overheadCost + monthlyFixed;
  }

  /**
   * Estimate revenue for a feature (simplified model)
   * In production, this would integrate with subscription/usage data
   * @param {Object} feature - Feature document
   * @param {number} tokenCost - Token cost
   * @returns {number} Estimated revenue
   */
  _estimateRevenue(feature, tokenCost) {
    // Simplified revenue estimation based on token cost with markup
    // In production, this would come from actual subscription/usage data
    const markupMultiplier = 2.5; // 150% markup for estimation
    const requests = feature.stats?.totalRequests || 0;

    // Estimate based on requests and average revenue per request
    const avgRevenuePerRequest = tokenCost * markupMultiplier / Math.max(requests, 1);
    return requests * avgRevenuePerRequest || tokenCost * markupMultiplier;
  }

  /**
   * Get cost trend over days
   * @param {string} organizationId - Organization ID
   * @param {number} days - Number of days
   * @returns {Array} Trend data
   */
  async _getCostTrend(organizationId, days) {
    const features = await Feature.find({ organization: organizationId }).lean();
    const trend = [];

    // Build date map for the requested period
    const dateMap = new Map();
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      dateMap.set(dateKey, { cost: 0, tokens: 0, requests: 0 });
    }

    // Aggregate usage history from features
    for (const feature of features) {
      if (feature.usageHistory && Array.isArray(feature.usageHistory)) {
        for (const usage of feature.usageHistory) {
          const dateKey = new Date(usage.date).toISOString().split('T')[0];
          if (dateMap.has(dateKey)) {
            const existing = dateMap.get(dateKey);
            existing.cost += usage.cost || 0;
            existing.tokens += usage.tokens || 0;
            existing.requests += usage.requests || 0;
          }
        }
      }
    }

    // Convert map to array and fill gaps with estimated values
    let lastKnownCost = 0;
    let lastKnownTokens = 0;

    // Get recent data to estimate missing values
    const recentData = Array.from(dateMap.entries()).slice(-7);
    const avgCost = recentData.reduce((sum, [_, d]) => sum + d.cost, 0) / Math.max(recentData.length, 1);
    const avgTokens = recentData.reduce((sum, [_, d]) => sum + d.tokens, 0) / Math.max(recentData.length, 1);

    for (const [dateKey, data] of dateMap.entries()) {
      if (data.cost > 0) {
        lastKnownCost = data.cost;
        lastKnownTokens = data.tokens;
      } else {
        // Use exponential smoothing for missing values
        data.cost = lastKnownCost > 0 ? lastKnownCost * 0.7 + avgCost * 0.3 : avgCost;
        data.tokens = lastKnownTokens > 0 ? lastKnownTokens * 0.7 + avgTokens * 0.3 : avgTokens;
      }

      trend.push({
        date: dateKey,
        cost: parseFloat(data.cost.toFixed(4)),
        tokens: Math.floor(data.tokens),
        requests: data.requests
      });
    }

    // Add infrastructure cost to each day
    const dailyInfraCost = features.reduce((sum, f) => {
      return sum + (this._calculateInfrastructureCost(f) / days);
    }, 0);

    trend.forEach(t => {
      t.cost = parseFloat((t.cost + dailyInfraCost).toFixed(4));
    });

    return trend;
  }

  /**
   * Calculate median of an array
   * @param {Array<number>} arr - Array of numbers
   * @returns {number} Median value
   */
  _calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Get summary report combining all analytics
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Summary report
   */
  async _getSummaryReport(organizationId, filters) {
    const [costs, profitability, margins, dashboard] = await Promise.all([
      this.getOperationalCosts(organizationId, filters),
      this.getFeatureProfitability(organizationId, filters),
      this.getMarginAnalytics(organizationId, filters),
      this.getDashboard(organizationId)
    ]);

    return {
      generatedAt: new Date().toISOString(),
      organization: dashboard.summary.organization,
      overview: {
        totalProjects: dashboard.summary.projects.total,
        totalFeatures: dashboard.summary.features.total,
        activeFeatures: dashboard.summary.features.active,
        totalCosts: costs.summary.totalCost,
        totalTokens: costs.summary.totalTokens,
        totalRequests: costs.summary.totalRequests
      },
      costs: {
        byModel: costs.costsByModel,
        byProvider: costs.costsByProvider,
        topFeatures: costs.topCostFeatures
      },
      profitability: {
        totalRevenue: profitability.summary.totalRevenue,
        totalProfit: profitability.summary.totalProfit,
        overallMargin: profitability.summary.overallMargin,
        topPerformers: profitability.topPerformers
      },
      margins: {
        averageMargin: margins.summary.averageMargin,
        medianMargin: margins.summary.medianMargin,
        distribution: margins.marginDistribution
      }
    };
  }

  /**
   * Generate Excel report
   * @param {string} reportType - Type of report
   * @param {Object} data - Report data
   * @returns {Buffer} Excel buffer
   */
  async _generateExcelReport(reportType, data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(this._getSheetName(reportType));

    // Add headers and data based on report type
    switch (reportType) {
      case 'costs':
        this._addCostsSheet(worksheet, data);
        break;
      case 'profitability':
        this._addProfitabilitySheet(worksheet, data);
        break;
      case 'margins':
        this._addMarginsSheet(worksheet, data);
        break;
      case 'summary':
        this._addSummarySheet(worksheet, data);
        break;
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate PDF report
   * @param {string} reportType - Type of report
   * @param {Object} data - Report data
   * @returns {Buffer} PDF buffer
   */
  async _generatePdfReport(reportType, data) {
    // If PDFKit is not available, return JSON fallback
    if (!PDFDocument) {
      logger.warn('[AnalyticsService] PDFKit not available, returning JSON fallback');
      return Buffer.from(JSON.stringify({
        reportType,
        generatedAt: new Date().toISOString(),
        data,
        note: 'Install pdfkit package for PDF generation'
      }, null, 2));
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `${this._getSheetName(reportType)} Report`,
            Author: 'API Token Manager',
            Subject: 'Analytics Report',
            CreationDate: new Date()
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24)
          .font('Helvetica-Bold')
          .text(this._getSheetName(reportType), { align: 'center' });

        doc.fontSize(10)
          .font('Helvetica')
          .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

        doc.moveDown(2);

        // Add content based on report type
        switch (reportType) {
          case 'costs':
            this._addCostsPdf(doc, data);
            break;
          case 'profitability':
            this._addProfitabilityPdf(doc, data);
            break;
          case 'margins':
            this._addMarginsPdf(doc, data);
            break;
          case 'summary':
            this._addSummaryPdf(doc, data);
            break;
          default:
            doc.text('No data available for this report type.');
        }

        // Footer
        doc.fontSize(8)
          .text('Generated by API Token Manager', 50, doc.page.height - 50, {
            align: 'center',
            width: doc.page.width - 100
          });

        doc.end();
      } catch (error) {
        logger.error(`[AnalyticsService] PDF generation error: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Add costs section to PDF
   */
  _addCostsPdf(doc, data) {
    // Summary box
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Cost: $${data.summary.totalCost.toFixed(4)}`);
    doc.text(`Total Tokens: ${data.summary.totalTokens.toLocaleString()}`);
    doc.text(`Total Requests: ${data.summary.totalRequests.toLocaleString()}`);
    doc.text(`Feature Count: ${data.summary.featureCount}`);

    doc.moveDown(2);

    // Costs by Model table
    doc.fontSize(14).font('Helvetica-Bold').text('Costs by Model', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [200, 100, 100, 100];

    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    let x = 50;
    ['Model', 'Cost ($)', 'Tokens', 'Requests'].forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    // Table rows
    doc.font('Helvetica');
    let y = tableTop + 20;
    data.costsByModel.slice(0, 15).forEach(item => {
      x = 50;
      doc.text(item.name, x, y, { width: colWidths[0] });
      doc.text(item.cost.toFixed(4), x + colWidths[0], y, { width: colWidths[1], align: 'right' });
      doc.text(item.tokens.toLocaleString(), x + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });
      doc.text(item.requests.toLocaleString(), x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });
      y += 18;
    });

    doc.moveDown(3);

    // Costs by Provider
    if (doc.y > 700) doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('Costs by Provider', { underline: true });
    doc.moveDown(0.5);

    y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    x = 50;
    ['Provider', 'Cost ($)', 'Tokens', 'Requests'].forEach((header, i) => {
      doc.text(header, x, y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    doc.font('Helvetica');
    y += 20;
    data.costsByProvider.forEach(item => {
      x = 50;
      doc.text(item.name, x, y, { width: colWidths[0] });
      doc.text(item.cost.toFixed(4), x + colWidths[0], y, { width: colWidths[1], align: 'right' });
      doc.text(item.tokens.toLocaleString(), x + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });
      doc.text(item.requests.toLocaleString(), x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });
      y += 18;
    });
  }

  /**
   * Add profitability section to PDF
   */
  _addProfitabilityPdf(doc, data) {
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Revenue: $${data.summary.totalRevenue.toFixed(2)}`);
    doc.text(`Total Costs: $${data.summary.totalCosts.toFixed(4)}`);
    doc.text(`Total Profit: $${data.summary.totalProfit.toFixed(2)}`);
    doc.text(`Overall Margin: ${data.summary.overallMargin}%`);

    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Feature Profitability', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [150, 70, 70, 70, 60, 80];

    doc.fontSize(9).font('Helvetica-Bold');
    let x = 50;
    ['Feature', 'Revenue ($)', 'Cost ($)', 'Profit ($)', 'Margin %', 'Status'].forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    doc.font('Helvetica');
    let y = tableTop + 20;
    data.features.slice(0, 20).forEach(item => {
      x = 50;
      doc.text(item.featureName, x, y, { width: colWidths[0] });
      doc.text(item.revenue.toFixed(2), x + colWidths[0], y, { width: colWidths[1], align: 'right' });
      doc.text(item.costs.totalCost.toFixed(4), x + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });
      doc.text(item.profit.toFixed(2), x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });
      doc.text(`${item.margin}%`, x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: 'right' });
      doc.text(item.status, x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5] });
      y += 18;
    });
  }

  /**
   * Add margins section to PDF
   */
  _addMarginsPdf(doc, data) {
    doc.fontSize(14).font('Helvetica-Bold').text('Margin Analytics Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Average Margin: ${data.summary.averageMargin}%`);
    doc.text(`Median Margin: ${data.summary.medianMargin}%`);
    doc.text(`High Margin Features: ${data.summary.highMarginCount || 0}`);
    doc.text(`Low Margin Features: ${data.summary.lowMarginCount || 0}`);

    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Margin Distribution', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Range', 50, tableTop);
    doc.text('Count', 200, tableTop);
    doc.text('Percentage', 300, tableTop);

    doc.font('Helvetica');
    let y = tableTop + 20;
    data.marginDistribution.forEach(item => {
      doc.text(item.range, 50, y);
      doc.text(item.count.toString(), 200, y);
      doc.text(`${item.percentage}%`, 300, y);
      y += 18;
    });
  }

  /**
   * Add summary section to PDF
   */
  _addSummaryPdf(doc, data) {
    doc.fontSize(14).font('Helvetica-Bold').text('Overview', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Projects: ${data.overview.totalProjects}`);
    doc.text(`Total Features: ${data.overview.totalFeatures}`);
    doc.text(`Active Features: ${data.overview.activeFeatures}`);
    doc.text(`Total Costs: $${data.overview.totalCosts.toFixed(4)}`);
    doc.text(`Total Tokens: ${data.overview.totalTokens.toLocaleString()}`);
    doc.text(`Total Requests: ${data.overview.totalRequests.toLocaleString()}`);

    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Profitability Summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Revenue: $${data.profitability.totalRevenue.toFixed(2)}`);
    doc.text(`Total Profit: $${data.profitability.totalProfit.toFixed(2)}`);
    doc.text(`Overall Margin: ${data.profitability.overallMargin}%`);

    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Margin Analytics', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Average Margin: ${data.margins.averageMargin}%`);
    doc.text(`Median Margin: ${data.margins.medianMargin}%`);
  }

  // Excel sheet helpers

  _getSheetName(reportType) {
    const names = {
      costs: 'Operational Costs',
      profitability: 'Feature Profitability',
      margins: 'Margin Analytics',
      summary: 'Summary Report'
    };
    return names[reportType] || 'Report';
  }

  _addCostsSheet(worksheet, data) {
    // Summary section
    worksheet.addRow(['Operational Costs Report']);
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Cost', data.summary.totalCost]);
    worksheet.addRow(['Total Tokens', data.summary.totalTokens]);
    worksheet.addRow(['Total Requests', data.summary.totalRequests]);
    worksheet.addRow(['Feature Count', data.summary.featureCount]);
    worksheet.addRow([]);

    // Costs by Model
    worksheet.addRow(['Costs by Model']);
    worksheet.addRow(['Model', 'Cost', 'Tokens', 'Requests']);
    data.costsByModel.forEach(item => {
      worksheet.addRow([item.name, item.cost, item.tokens, item.requests]);
    });
    worksheet.addRow([]);

    // Costs by Provider
    worksheet.addRow(['Costs by Provider']);
    worksheet.addRow(['Provider', 'Cost', 'Tokens', 'Requests']);
    data.costsByProvider.forEach(item => {
      worksheet.addRow([item.name, item.cost, item.tokens, item.requests]);
    });
    worksheet.addRow([]);

    // Top Cost Features
    worksheet.addRow(['Top Cost Features']);
    worksheet.addRow(['Feature', 'Cost', 'Tokens', 'Requests']);
    data.topCostFeatures.forEach(item => {
      worksheet.addRow([item.name, item.cost, item.tokens, item.requests]);
    });
  }

  _addProfitabilitySheet(worksheet, data) {
    worksheet.addRow(['Feature Profitability Report']);
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Total Revenue', data.summary.totalRevenue]);
    worksheet.addRow(['Total Costs', data.summary.totalCosts]);
    worksheet.addRow(['Total Profit', data.summary.totalProfit]);
    worksheet.addRow(['Overall Margin', `${data.summary.overallMargin}%`]);
    worksheet.addRow([]);

    worksheet.addRow(['Feature Profitability']);
    worksheet.addRow(['Feature', 'Revenue', 'Costs', 'Profit', 'Margin %', 'Status']);
    data.features.forEach(item => {
      worksheet.addRow([
        item.featureName,
        item.revenue,
        item.costs.totalCost,
        item.profit,
        `${item.margin}%`,
        item.status
      ]);
    });
  }

  _addMarginsSheet(worksheet, data) {
    worksheet.addRow(['Margin Analytics Report']);
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.addRow(['Average Margin', `${data.summary.averageMargin}%`]);
    worksheet.addRow(['Median Margin', `${data.summary.medianMargin}%`]);
    worksheet.addRow(['Profitable Features', data.summary.profitableFeatures]);
    worksheet.addRow(['Unprofitable Features', data.summary.unprofitableFeatures]);
    worksheet.addRow([]);

    worksheet.addRow(['Margin Distribution']);
    worksheet.addRow(['Range', 'Count', 'Percentage']);
    data.marginDistribution.forEach(item => {
      worksheet.addRow([item.range, item.count, `${item.percentage}%`]);
    });
    worksheet.addRow([]);

    worksheet.addRow(['Feature Margins']);
    worksheet.addRow(['Feature', 'Gross Margin %', 'Profit', 'Revenue', 'Costs']);
    data.features.forEach(item => {
      worksheet.addRow([
        item.featureName,
        `${item.grossMargin}%`,
        item.profit,
        item.revenue,
        item.costs
      ]);
    });
  }

  _addSummarySheet(worksheet, data) {
    worksheet.addRow(['Analytics Summary Report']);
    worksheet.addRow(['Generated At', data.generatedAt]);
    worksheet.addRow([]);

    worksheet.addRow(['Overview']);
    worksheet.addRow(['Total Projects', data.overview.totalProjects]);
    worksheet.addRow(['Total Features', data.overview.totalFeatures]);
    worksheet.addRow(['Active Features', data.overview.activeFeatures]);
    worksheet.addRow(['Total Costs', data.overview.totalCosts]);
    worksheet.addRow(['Total Tokens', data.overview.totalTokens]);
    worksheet.addRow(['Total Requests', data.overview.totalRequests]);
    worksheet.addRow([]);

    worksheet.addRow(['Profitability']);
    worksheet.addRow(['Total Revenue', data.profitability.totalRevenue]);
    worksheet.addRow(['Total Profit', data.profitability.totalProfit]);
    worksheet.addRow(['Overall Margin', `${data.profitability.overallMargin}%`]);
    worksheet.addRow([]);

    worksheet.addRow(['Margins']);
    worksheet.addRow(['Average Margin', `${data.margins.averageMargin}%`]);
    worksheet.addRow(['Median Margin', `${data.margins.medianMargin}%`]);
  }
}

export default new AnalyticsService();