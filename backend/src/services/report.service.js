import Report, { REPORT_TYPES, REPORT_STATUS, FILE_FORMATS } from '../models/Report.js';
import { Feature } from '../models/index.js';
import { Plan } from '../models/index.js';
import { Provider } from '../models/index.js';
import { AIModel } from '../models/index.js';
import { Organization } from '../models/index.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

class ReportService {
  /**
   * Create a new report
   */
  async createReport(organizationId, userId, reportData) {
    const report = new Report({
      organization: organizationId,
      createdBy: userId,
      ...reportData
    });

    await report.save();
    return report;
  }

  /**
   * Create report from template
   */
  async createFromTemplate(templateId, userId, overrides = {}) {
    const template = await Report.findById(templateId);
    if (!template || !template.isTemplate) {
      throw new Error('Template not found');
    }

    const reportData = {
      name: overrides.name || `${template.name} - Copy`,
      type: template.type,
      description: template.description,
      parameters: {
        ...template.parameters.toObject(),
        ...overrides.parameters
      },
      tags: template.tags,
      templateId: templateId
    };

    return this.createReport(template.organization, userId, reportData);
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId, organizationId = null) {
    const query = { _id: reportId };
    if (organizationId) {
      query.organization = organizationId;
    }

    const report = await Report.findOne(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('parameters.features', 'name category')
      .populate('parameters.plans', 'name pricing.monthlyPrice')
      .populate('parameters.providers', 'name slug')
      .populate('parameters.models', 'name type');

    return report;
  }

  /**
   * List reports for organization
   */
  async listReports(organizationId, options = {}) {
    const {
      type,
      status,
      isTemplate,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = options;

    const query = { organization: organizationId };

    if (type) query.type = type;
    if (status) query.status = status;
    if (isTemplate !== undefined) query.isTemplate = isTemplate;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const reports = await Report.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');

    const total = await Report.countDocuments(query);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update report
   */
  async updateReport(reportId, organizationId, updates) {
    const report = await Report.findOneAndUpdate(
      { _id: reportId, organization: organizationId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    return report;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId, organizationId) {
    const result = await Report.findOneAndDelete({
      _id: reportId,
      organization: organizationId
    });

    return result !== null;
  }

  /**
   * Generate report data based on type
   */
  async generateReport(reportId) {
    const report = await Report.findById(reportId)
      .populate('parameters.features')
      .populate('parameters.plans')
      .populate('parameters.providers')
      .populate('parameters.models');

    if (!report) {
      throw new Error('Report not found');
    }

    // Update status to processing
    report.status = 'processing';
    await report.save();

    try {
      let data;

      switch (report.type) {
        case 'cost_analysis':
          data = await this.generateCostAnalysis(report);
          break;
        case 'margin_analysis':
          data = await this.generateMarginAnalysis(report);
          break;
        case 'profit_forecast':
          data = await this.generateProfitForecast(report);
          break;
        case 'usage_report':
          data = await this.generateUsageReport(report);
          break;
        case 'feature_usage':
          data = await this.generateFeatureUsage(report);
          break;
        case 'provider_comparison':
          data = await this.generateProviderComparison(report);
          break;
        case 'simulation_results':
          data = await this.generateSimulationResults(report);
          break;
        case 'custom':
          data = await this.generateCustomReport(report);
          break;
        default:
          throw new Error(`Unknown report type: ${report.type}`);
      }

      report.data = data;
      report.status = 'completed';
      report.file = {
        generatedAt: new Date()
      };

      await report.save();
      return report;

    } catch (error) {
      report.status = 'failed';
      report.error = {
        message: error.message,
        stack: error.stack,
        occurredAt: new Date()
      };
      await report.save();
      throw error;
    }
  }

  /**
   * Generate Cost Analysis Report
   */
  async generateCostAnalysis(report) {
    const { parameters } = report;
    const { dateRange, features, plans, groupBy } = parameters;
    const organization = report.organization;

    // Aggregate data based on parameters
    const featureData = features.length > 0
      ? await Feature.find({ _id: { $in: features } })
      : await Feature.find({ organization });

    // Calculate cost breakdown
    const breakdown = [];
    const timeSeries = [];
    const summary = new Map();

    let totalInputCost = 0;
    let totalOutputCost = 0;
    let totalInfrastructureCost = 0;

    for (const feature of featureData) {
      const inputCost = (feature.tokenEstimates?.inputTokensAvg || 0) * (feature.usageFrequency?.avgPerUser || 0) * 0.01 / 1000;
      const outputCost = (feature.tokenEstimates?.outputTokensAvg || 0) * (feature.usageFrequency?.avgPerUser || 0) * 0.03 / 1000;
      const infraCost = feature.infrastructure?.baseCost || 0;

      totalInputCost += inputCost;
      totalOutputCost += outputCost;
      totalInfrastructureCost += infraCost;

      breakdown.push({
        category: 'feature',
        subcategory: feature.name,
        metrics: {
          inputCost: inputCost.toFixed(4),
          outputCost: outputCost.toFixed(4),
          infrastructureCost: infraCost.toFixed(2),
          totalCost: (inputCost + outputCost + infraCost).toFixed(4),
          usagePerUser: feature.usageFrequency?.avgPerUser || 0
        }
      });
    }

    // Generate time series data
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const intervals = this.generateTimeIntervals(startDate, endDate, groupBy);

    // Get actual user count for the organization
    const orgDoc = await Organization.findById(report.organization).populate('members');
    const userCount = orgDoc?.members?.length || 1;

    // Get features with usage history for time series
    const featuresWithHistory = await Feature.find({
      organization: report.organization,
      'usageHistory.0': { $exists: true }
    });

    for (const interval of intervals) {
      // Calculate actual costs for this interval from usage history
      let intervalInputCost = 0;
      let intervalOutputCost = 0;

      for (const feature of featuresWithHistory) {
        if (feature.usageHistory) {
          for (const usage of feature.usageHistory) {
            const usageDate = new Date(usage.date);
            if (usageDate >= interval.start && usageDate <= interval.end) {
              intervalInputCost += (usage.inputTokens || 0) * (feature.pricing?.inputTokenPrice || 0);
              intervalOutputCost += (usage.outputTokens || 0) * (feature.pricing?.outputTokenPrice || 0);
            }
          }
        }
      }

      const intervalTotalCost = intervalInputCost + intervalOutputCost || (totalInputCost + totalOutputCost + totalInfrastructureCost);

      timeSeries.push({
        period: interval.label,
        date: interval.start,
        metrics: {
          totalCost: intervalTotalCost.toFixed(2),
          inputCost: intervalInputCost.toFixed(2),
          outputCost: intervalOutputCost.toFixed(2),
          features: featureData.length,
          users: userCount
        }
      });
    }

    summary.set('totalCost', (totalInputCost + totalOutputCost + totalInfrastructureCost).toFixed(2));
    summary.set('inputCost', totalInputCost.toFixed(2));
    summary.set('outputCost', totalOutputCost.toFixed(2));
    summary.set('infrastructureCost', totalInfrastructureCost.toFixed(2));
    summary.set('featureCount', featureData.length);
    summary.set('currency', parameters.currency || 'USD');
    summary.set('period', `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`);

    return {
      summary,
      breakdown,
      timeSeries,
      charts: {
        costDistribution: {
          type: 'pie',
          data: {
            labels: ['Input Token Cost', 'Output Token Cost', 'Infrastructure'],
            values: [totalInputCost, totalOutputCost, totalInfrastructureCost]
          }
        },
        costTrend: {
          type: 'line',
          data: {
            labels: timeSeries.map(t => t.period),
            values: timeSeries.map(t => parseFloat(t.metrics.totalCost))
          }
        }
      }
    };
  }

  /**
   * Generate Margin Analysis Report
   */
  async generateMarginAnalysis(report) {
    const { parameters } = report;
    const { dateRange, plans, groupBy } = parameters;

    const planData = plans.length > 0
      ? await Plan.find({ _id: { $in: plans } })
      : await Plan.find({ organization: report.organization });

    // Get actual feature costs
    const features = await Feature.find({ organization: report.organization });
    const totalFeatureCost = features.reduce((sum, f) => sum + (f.stats?.totalCost || 0), 0);

    // Get organization for member count
    const organization = await Organization.findById(report.organization);
    const activeUsers = organization?.members?.length || 1;

    const breakdown = [];
    const summary = new Map();
    let totalRevenue = 0;
    let totalCost = 0;

    for (const plan of planData) {
      const revenue = plan.pricing?.monthlyPrice || 0;

      // Calculate actual cost based on feature usage
      const planFeatures = features.filter(f => f.plan?.toString() === plan._id.toString());
      const planCost = planFeatures.reduce((sum, f) => sum + (f.stats?.totalCost || 0), 0);

      // Estimate users based on subscription or feature usage patterns
      const estimatedUsers = plan.stats?.activeUsers || Math.max(1, Math.floor(planFeatures.length / 3));

      // Calculate revenue based on actual subscribers or estimates
      const subscribers = plan.stats?.subscribers || estimatedUsers;
      const monthlyRevenue = revenue * subscribers;

      // Use actual costs where available
      const actualCost = planCost > 0 ? planCost : (monthlyRevenue * 0.35); // Default 35% cost ratio if no actual data
      const margin = monthlyRevenue > 0 ? ((monthlyRevenue - actualCost) / monthlyRevenue) * 100 : 0;

      totalRevenue += monthlyRevenue;
      totalCost += actualCost;

      breakdown.push({
        category: 'plan',
        subcategory: plan.name,
        metrics: {
          price: revenue.toFixed(2),
          subscribers,
          monthlyRevenue: monthlyRevenue.toFixed(2),
          actualCost: actualCost.toFixed(4),
          grossProfit: (monthlyRevenue - actualCost).toFixed(2),
          marginPercentage: margin.toFixed(2),
          costRatio: monthlyRevenue > 0 ? ((actualCost / monthlyRevenue) * 100).toFixed(1) : '0'
        }
      });
    }

    // Add feature-level margin breakdown
    const topFeatures = features
      .filter(f => f.stats?.totalCost > 0)
      .sort((a, b) => (b.stats?.totalCost || 0) - (a.stats?.totalCost || 0))
      .slice(0, 10);

    for (const feature of topFeatures) {
      const cost = feature.stats?.totalCost || 0;
      const revenue = feature.stats?.totalRequests * (feature.pricing?.perRequestPrice || 0.01);
      const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

      breakdown.push({
        category: 'feature',
        subcategory: feature.name,
        metrics: {
          requests: feature.stats?.totalRequests || 0,
          tokens: feature.stats?.totalTokens || 0,
          cost: cost.toFixed(4),
          revenue: revenue.toFixed(2),
          marginPercentage: margin.toFixed(2)
        }
      });
    }

    summary.set('totalRevenue', totalRevenue.toFixed(2));
    summary.set('totalCost', totalCost.toFixed(2));
    summary.set('grossProfit', (totalRevenue - totalCost).toFixed(2));
    summary.set('averageMargin', totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(2) : '0');
    summary.set('planCount', planData.length);
    summary.set('activeUsers', activeUsers);
    summary.set('featureCount', features.length);
    summary.set('currency', parameters.currency || 'USD');

    return {
      summary,
      breakdown,
      timeSeries: [],
      charts: {
        marginDistribution: {
          type: 'bar',
          data: {
            labels: planData.map(p => p.name),
            values: breakdown.map(b => parseFloat(b.metrics.marginPercentage))
          }
        },
        revenueVsCost: {
          type: 'bar',
          data: {
            labels: ['Revenue', 'Cost', 'Profit'],
            values: [totalRevenue, totalCost, totalRevenue - totalCost]
          }
        }
      }
    };
  }

  /**
   * Generate Profit Forecast Report
   */
  async generateProfitForecast(report) {
    const { parameters } = report;
    const { dateRange, groupBy } = parameters;

    const summary = new Map();
    const timeSeries = [];

    // Generate forecast for each period
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const intervals = this.generateTimeIntervals(startDate, endDate, groupBy);

    let baseUsers = 1000;
    let growthRate = 0.1; // 10% growth
    let revenuePerUser = 50;
    let costPerUser = 20;

    let totalRevenue = 0;
    let totalCost = 0;
    let currentUsers = baseUsers;

    for (const interval of intervals) {
      const revenue = currentUsers * revenuePerUser;
      const cost = currentUsers * costPerUser;
      const profit = revenue - cost;

      totalRevenue += revenue;
      totalCost += cost;

      timeSeries.push({
        period: interval.label,
        date: interval.start,
        metrics: {
          users: currentUsers.toFixed(0),
          revenue: revenue.toFixed(2),
          cost: cost.toFixed(2),
          profit: profit.toFixed(2),
          margin: ((profit / revenue) * 100).toFixed(2)
        }
      });

      currentUsers = currentUsers * (1 + growthRate);
    }

    summary.set('totalRevenue', totalRevenue.toFixed(2));
    summary.set('totalCost', totalCost.toFixed(2));
    summary.set('totalProfit', (totalRevenue - totalCost).toFixed(2));
    summary.set('averageMargin', (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(2));
    summary.set('projectedUsers', currentUsers.toFixed(0));
    summary.set('growthRate', (growthRate * 100).toFixed(1));
    summary.set('currency', parameters.currency || 'USD');

    return {
      summary,
      breakdown: [],
      timeSeries,
      charts: {
        profitForecast: {
          type: 'line',
          data: {
            labels: timeSeries.map(t => t.period),
            datasets: [
              { label: 'Revenue', values: timeSeries.map(t => parseFloat(t.metrics.revenue)) },
              { label: 'Cost', values: timeSeries.map(t => parseFloat(t.metrics.cost)) },
              { label: 'Profit', values: timeSeries.map(t => parseFloat(t.metrics.profit)) }
            ]
          }
        },
        userGrowth: {
          type: 'line',
          data: {
            labels: timeSeries.map(t => t.period),
            values: timeSeries.map(t => parseFloat(t.metrics.users))
          }
        }
      }
    };
  }

  /**
   * Generate Usage Report
   */
  async generateUsageReport(report) {
    const { parameters } = report;
    const { dateRange, features, groupBy } = parameters;

    const featureData = features.length > 0
      ? await Feature.find({ _id: { $in: features } })
      : await Feature.find({ organization: report.organization });

    const breakdown = [];
    const timeSeries = [];
    const summary = new Map();

    let totalRequests = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const feature of featureData) {
      const requests = feature.usageFrequency?.avgPerUser || 0;
      const inputTokens = feature.tokenEstimates?.inputTokensAvg || 0;
      const outputTokens = feature.tokenEstimates?.outputTokensAvg || 0;

      totalRequests += requests;
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      breakdown.push({
        category: 'feature',
        subcategory: feature.name,
        metrics: {
          requestsPerUser: requests,
          avgInputTokens: inputTokens,
          avgOutputTokens: outputTokens,
          totalTokensPerRequest: inputTokens + outputTokens
        }
      });
    }

    // Generate time series
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const intervals = this.generateTimeIntervals(startDate, endDate, groupBy);

    for (const interval of intervals) {
      timeSeries.push({
        period: interval.label,
        date: interval.start,
        metrics: {
          requests: totalRequests * 100, // Estimated
          inputTokens: totalInputTokens * 100,
          outputTokens: totalOutputTokens * 100
        }
      });
    }

    summary.set('totalFeatures', featureData.length);
    summary.set('totalRequests', totalRequests);
    summary.set('totalInputTokens', totalInputTokens);
    summary.set('totalOutputTokens', totalOutputTokens);
    summary.set('avgRequestsPerFeature', (totalRequests / featureData.length || 0).toFixed(2));

    return {
      summary,
      breakdown,
      timeSeries,
      charts: {
        usageDistribution: {
          type: 'pie',
          data: {
            labels: featureData.map(f => f.name),
            values: featureData.map(f => f.usageFrequency?.avgPerUser || 0)
          }
        }
      }
    };
  }

  /**
   * Generate Feature Usage Report
   */
  async generateFeatureUsage(report) {
    return this.generateUsageReport(report); // Similar logic
  }

  /**
   * Generate Provider Comparison Report
   */
  async generateProviderComparison(report) {
    const { parameters } = report;
    const { providers, models } = parameters;

    const providerData = providers.length > 0
      ? await Provider.find({ _id: { $in: providers } })
      : await Provider.find({});

    const modelData = models.length > 0
      ? await AIModel.find({ _id: { $in: models } }).populate('provider')
      : await AIModel.find({}).populate('provider');

    const breakdown = [];
    const summary = new Map();

    for (const model of modelData) {
      breakdown.push({
        category: model.provider?.name || 'Unknown',
        subcategory: model.name,
        metrics: {
          contextWindow: model.contextWindow || 0,
          maxOutputTokens: model.maxOutputTokens || 0,
          inputCostPerK: model.currentPricing?.inputCost || 0,
          outputCostPerK: model.currentPricing?.outputCost || 0,
          capabilities: model.capabilities?.join(', ') || 'N/A'
        }
      });
    }

    summary.set('totalProviders', providerData.length);
    summary.set('totalModels', modelData.length);
    summary.set('currency', 'USD');

    return {
      summary,
      breakdown,
      timeSeries: [],
      charts: {
        pricingComparison: {
          type: 'bar',
          data: {
            labels: modelData.map(m => m.name),
            datasets: [
              { label: 'Input Cost/K', values: modelData.map(m => m.currentPricing?.inputCost || 0) },
              { label: 'Output Cost/K', values: modelData.map(m => m.currentPricing?.outputCost || 0) }
            ]
          }
        }
      }
    };
  }

  /**
   * Generate Simulation Results Report
   */
  async generateSimulationResults(report) {
    const { parameters } = report;
    // Import Simulation model dynamically to avoid circular dependency
    const { Simulation } = await import('../models/index.js');

    const simulations = await Simulation.find({
      organization: report.organization,
      createdAt: {
        $gte: parameters.dateRange.start,
        $lte: parameters.dateRange.end
      }
    }).populate('createdBy', 'firstName lastName');

    const breakdown = [];
    const summary = new Map();

    for (const sim of simulations) {
      breakdown.push({
        category: sim.type,
        subcategory: sim.name,
        metrics: {
          status: sim.status,
          createdAt: sim.createdAt,
          results: sim.results ? 'Available' : 'Pending'
        }
      });
    }

    summary.set('totalSimulations', simulations.length);
    summary.set('completed', simulations.filter(s => s.status === 'completed').length);
    summary.set('pending', simulations.filter(s => s.status === 'draft').length);
    summary.set('failed', simulations.filter(s => s.status === 'failed').length);

    return {
      summary,
      breakdown,
      timeSeries: [],
      charts: {}
    };
  }

  /**
   * Generate Custom Report
   */
  async generateCustomReport(report) {
    // Custom reports use provided parameters directly
    return {
      summary: new Map(),
      breakdown: [],
      timeSeries: [],
      charts: {}
    };
  }

  /**
   * Generate time intervals for time series
   */
  generateTimeIntervals(startDate, endDate, groupBy) {
    const intervals = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current < end) {
      const intervalStart = new Date(current);
      let intervalEnd;
      let label;

      switch (groupBy) {
        case 'day':
          intervalEnd = new Date(current);
          intervalEnd.setDate(intervalEnd.getDate() + 1);
          label = current.toISOString().split('T')[0];
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          intervalEnd = new Date(current);
          intervalEnd.setDate(intervalEnd.getDate() + 7);
          label = `Week of ${current.toISOString().split('T')[0]}`;
          current.setDate(current.getDate() + 7);
          break;
        case 'quarter':
          intervalEnd = new Date(current);
          intervalEnd.setMonth(intervalEnd.getMonth() + 3);
          label = `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`;
          current.setMonth(current.getMonth() + 3);
          break;
        case 'year':
          intervalEnd = new Date(current);
          intervalEnd.setFullYear(intervalEnd.getFullYear() + 1);
          label = current.getFullYear().toString();
          current.setFullYear(current.getFullYear() + 1);
          break;
        case 'month':
        default:
          intervalEnd = new Date(current);
          intervalEnd.setMonth(intervalEnd.getMonth() + 1);
          label = `${current.toLocaleString('default', { month: 'short' })} ${current.getFullYear()}`;
          current.setMonth(current.getMonth() + 1);
          break;
      }

      if (intervalEnd > end) {
        intervalEnd = end;
      }

      intervals.push({
        start: intervalStart,
        end: intervalEnd,
        label
      });
    }

    return intervals;
  }

  /**
   * Export report to specified format
   */
  async exportReport(reportId, format = 'json') {
    const report = await Report.findById(reportId)
      .populate('createdBy', 'firstName lastName email')
      .populate('organization', 'name');

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'completed') {
      throw new Error('Report must be completed before export');
    }

    let exportData;
    let contentType;
    let extension;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(report.toObject(), null, 2);
        contentType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        exportData = this.convertToCSV(report);
        contentType = 'text/csv';
        extension = 'csv';
        break;
      case 'excel':
        // For Excel, we'd need a library like exceljs
        // For now, return CSV format
        exportData = this.convertToCSV(report);
        contentType = 'application/vnd.ms-excel';
        extension = 'csv';
        break;
      case 'pdf':
        // For PDF, we'd need a library like pdfkit
        // For now, return JSON format
        exportData = JSON.stringify(report.toObject(), null, 2);
        contentType = 'application/pdf';
        extension = 'pdf';
        break;
      default:
        exportData = JSON.stringify(report.toObject(), null, 2);
        contentType = 'application/json';
        extension = 'json';
    }

    // Update report file info
    report.file = {
      format,
      size: Buffer.byteLength(exportData),
      generatedAt: new Date()
    };
    await report.save();

    return {
      data: exportData,
      contentType,
      extension,
      filename: `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${extension}`
    };
  }

  /**
   * Convert report to CSV
   */
  convertToCSV(report) {
    const lines = [];

    // Header
    lines.push(`Report: ${report.name}`);
    lines.push(`Type: ${report.type}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('Summary');
    lines.push('Metric,Value');
    for (const [key, value] of report.data.summary) {
      lines.push(`${key},${value}`);
    }
    lines.push('');

    // Breakdown
    if (report.data.breakdown && report.data.breakdown.length > 0) {
      lines.push('Breakdown');
      const headers = ['Category', 'Subcategory'];
      const firstMetrics = report.data.breakdown[0].metrics;
      for (const key of firstMetrics.keys()) {
        headers.push(key);
      }
      lines.push(headers.join(','));

      for (const item of report.data.breakdown) {
        const row = [item.category, item.subcategory];
        for (const [, value] of item.metrics) {
          row.push(value);
        }
        lines.push(row.join(','));
      }
      lines.push('');
    }

    // Time Series
    if (report.data.timeSeries && report.data.timeSeries.length > 0) {
      lines.push('Time Series');
      const tsHeaders = ['Period', 'Date'];
      const firstTsMetrics = report.data.timeSeries[0].metrics;
      for (const key of firstTsMetrics.keys()) {
        tsHeaders.push(key);
      }
      lines.push(tsHeaders.join(','));

      for (const ts of report.data.timeSeries) {
        const row = [ts.period, ts.date.toISOString().split('T')[0]];
        for (const [, value] of ts.metrics) {
          row.push(value);
        }
        lines.push(row.join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Share report with users
   */
  async shareReport(reportId, userIds, permission = 'view') {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    for (const userId of userIds) {
      // Remove existing share if any
      report.sharedWith = report.sharedWith.filter(
        s => s.user.toString() !== userId.toString()
      );
      // Add new share
      report.sharedWith.push({ user: userId, permission });
    }

    await report.save();
    return report;
  }

  /**
   * Remove share
   */
  async removeShare(reportId, userId) {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.sharedWith = report.sharedWith.filter(
      s => s.user.toString() !== userId.toString()
    );

    await report.save();
    return report;
  }

  /**
   * Get report templates
   */
  async getTemplates(organizationId) {
    return Report.findTemplates(organizationId);
  }

  /**
   * Create template
   */
  async createTemplate(organizationId, userId, templateData) {
    const template = new Report({
      organization: organizationId,
      createdBy: userId,
      isTemplate: true,
      ...templateData
    });

    await template.save();
    return template;
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports() {
    return Report.findScheduled();
  }

  /**
   * Process scheduled reports
   */
  async processScheduledReports() {
    const scheduledReports = await this.getScheduledReports();

    for (const report of scheduledReports) {
      try {
        await this.generateReport(report._id);

        // Update next run time based on frequency
        if (report.schedule.frequency !== 'once') {
          const nextRun = this.calculateNextRun(report.schedule.frequency);
          report.schedule.lastRun = new Date();
          report.schedule.nextRun = nextRun;
          await report.save();
        }
      } catch (error) {
        console.error(`Failed to process scheduled report ${report._id}:`, error);
      }
    }
  }

  /**
   * Calculate next run date based on frequency
   */
  calculateNextRun(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      default:
        return null;
    }
  }
}

export default new ReportService();