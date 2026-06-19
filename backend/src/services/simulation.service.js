/**
 * Simulation Service
 *
 * Handles simulation creation, execution, and analysis.
 * Implements FR-35 to FR-39: Simulation & Forecasting
 */

import Simulation from '../models/Simulation.js';
import Organization from '../models/Organization.js';
import Feature from '../models/Feature.js';
import AIModel from '../models/AIModel.js';
import Plan from '../models/Plan.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import auditService from './audit.service.js';

class SimulationService {
  /**
   * Create a new simulation
   * @param {Object} data - Simulation data
   * @param {string} userId - User ID
   * @returns {Object} Created simulation
   */
  async create(data, userId) {
    const { organizationId, projectId, ...simulationData } = data;

    // Verify organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Create simulation
    const simulation = await Simulation.create({
      ...simulationData,
      organization: organizationId,
      project: projectId || null,
      createdBy: userId,
      status: 'draft'
    });

    // Create audit log
    await auditService.log({
      organization: organizationId,
      user: userId,
      action: 'simulation_created',
      resourceType: 'simulation',
      resourceId: simulation._id.toString(),
      resourceName: simulation.name,
      description: `Created simulation "${simulation.name}" of type ${simulation.type || 'custom'}`,
      severity: 'info',
      status: 'success'
    });

    logger.info(`Simulation created: ${simulation._id} by user ${userId}`);

    return simulation;
  }

  /**
   * Get simulation by ID
   * @param {string} simulationId - Simulation ID
   * @param {string} userId - User ID
   * @returns {Object} Simulation
   */
  async getById(simulationId, userId) {
    const simulation = await Simulation.findById(simulationId)
      .populate('organization', 'name slug')
      .populate('project', 'name')
      .populate('createdBy', 'firstName lastName email')
      .populate('parameters.pricingChange.modelId', 'name displayName');

    if (!simulation) {
      throw new AppError('Simulation not found', 404, 'NOT_FOUND');
    }

    return simulation;
  }

  /**
   * Get simulations for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Array} Simulations
   */
  async getForOrganization(organizationId, filters = {}) {
    const simulations = await Simulation.findByOrganization(organizationId, filters);
    return simulations;
  }

  /**
   * Update simulation
   * @param {string} simulationId - Simulation ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID
   * @returns {Object} Updated simulation
   */
  async update(simulationId, data, userId) {
    const simulation = await Simulation.findById(simulationId);

    if (!simulation) {
      throw new AppError('Simulation not found', 404, 'NOT_FOUND');
    }

    // Don't allow updates to running simulations
    if (simulation.status === 'running') {
      throw new AppError('Cannot update a running simulation', 400, 'INVALID_STATUS');
    }

    const allowedUpdates = ['name', 'description', 'type', 'parameters', 'tags', 'isPublic'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        simulation[field] = data[field];
      }
    });

    simulation.lastModifiedBy = userId;
    await simulation.save();

    // Create audit log
    await auditService.log({
      organization: simulation.organization,
      user: userId,
      action: 'update',
      resourceType: 'simulation',
      resourceId: simulationId.toString(),
      resourceName: simulation.name,
      description: `Updated simulation "${simulation.name}"`,
      severity: 'info',
      status: 'success'
    });

    logger.info(`Simulation updated: ${simulationId} by user ${userId}`);

    return simulation;
  }

  /**
   * Delete simulation
   * @param {string} simulationId - Simulation ID
   * @returns {Object} Success message
   */
  async delete(simulationId) {
    const simulation = await Simulation.findById(simulationId);

    if (!simulation) {
      throw new AppError('Simulation not found', 404, 'NOT_FOUND');
    }

    // Create audit log before deletion
    await auditService.log({
      organization: simulation.organization,
      user: simulation.createdBy,
      action: 'simulation_deleted',
      resourceType: 'simulation',
      resourceId: simulationId.toString(),
      resourceName: simulation.name,
      description: `Deleted simulation "${simulation.name}"`,
      severity: 'warning',
      status: 'success'
    });

    await Simulation.findByIdAndDelete(simulationId);

    logger.info(`Simulation deleted: ${simulationId}`);

    return { message: 'Simulation deleted successfully' };
  }

  /**
   * Run simulation
   * @param {string} simulationId - Simulation ID
   * @param {string} userId - User ID
   * @returns {Object} Simulation with results
   */
  async runSimulation(simulationId, userId) {
    const simulation = await Simulation.findById(simulationId);

    if (!simulation) {
      throw new AppError('Simulation not found', 404, 'NOT_FOUND');
    }

    if (simulation.status === 'running') {
      throw new AppError('Simulation is already running', 400, 'ALREADY_RUNNING');
    }

    try {
      // Mark as running
      await simulation.run();

      // Gather base data
      const baseData = await this.gatherBaseData(simulation);
      simulation.baseData = baseData;

      // Run calculation based on type
      let results;
      switch (simulation.type) {
        case 'growth':
          results = await this.runGrowthSimulation(simulation, baseData);
          break;
        case 'pricing_change':
          results = await this.runPricingChangeSimulation(simulation, baseData);
          break;
        case 'expense_forecast':
          results = await this.runExpenseForecastSimulation(simulation, baseData);
          break;
        case 'revenue_forecast':
          results = await this.runRevenueForecastSimulation(simulation, baseData);
          break;
        case 'custom':
          results = await this.runCustomSimulation(simulation, baseData);
          break;
        default:
          throw new AppError('Unknown simulation type', 400, 'INVALID_TYPE');
      }

      // Complete simulation
      await simulation.complete(results);

      // Create audit log for successful run
      await auditService.log({
        organization: simulation.organization,
        user: userId,
        action: 'simulation_run',
        resourceType: 'simulation',
        resourceId: simulationId.toString(),
        resourceName: simulation.name,
        description: `Successfully ran simulation "${simulation.name}" of type ${simulation.type || 'custom'}`,
        severity: 'info',
        status: 'success'
      });

      logger.info(`Simulation completed: ${simulationId}`);

      return simulation;
    } catch (error) {
      await simulation.fail(error);

      // Create audit log for failed run
      await auditService.log({
        organization: simulation.organization,
        user: userId,
        action: 'simulation_run',
        resourceType: 'simulation',
        resourceId: simulationId.toString(),
        resourceName: simulation.name,
        description: `Failed to run simulation "${simulation.name}": ${error.message}`,
        severity: 'error',
        status: 'failure',
        error: {
          message: error.message,
          code: error.code
        }
      });

      logger.error(`Simulation failed: ${simulationId}`, error);
      throw error;
    }
  }

  /**
   * Gather base data for simulation
   * @param {Object} simulation - Simulation object
   * @returns {Object} Base data
   */
  async gatherBaseData(simulation) {
    const organization = await Organization.findById(simulation.organization)
      .populate('members.user', 'firstName lastName email');

    // Get features
    const features = await Feature.find({
      organization: simulation.organization,
      status: 'active'
    }).populate('model', 'name displayName pricing');

    // Calculate totals
    let totalTokenUsage = 0;
    let totalCost = 0;
    const featureData = features.map(f => {
      const tokens = (f.tokenEstimates?.inputTokens || 0) + (f.tokenEstimates?.outputTokens || 0);
      const cost = f.estimatedCost || 0;
      totalTokenUsage += tokens;
      totalCost += cost;
      return {
        featureId: f._id,
        name: f.name,
        tokenUsage: tokens,
        cost: cost
      };
    });

    // Get models
    const models = await AIModel.find({ isActive: true })
      .populate('provider', 'name displayName');
    const modelData = models.map(m => ({
      modelId: m._id,
      name: m.displayName || m.name,
      inputPrice: m.pricing?.inputPrice || 0,
      outputPrice: m.pricing?.outputPrice || 0
    }));

    // Get plans for revenue estimation
    const plans = await Plan.find({
      organization: simulation.organization,
      status: 'active'
    });

    let subscriptionRevenue = 0;
    plans.forEach(p => {
      subscriptionRevenue += (p.pricing?.monthlyPrice || 0);
    });

    return {
      totalUsers: organization.members?.length || 0,
      activeUsers: organization.members?.filter(m => m.isActive !== false).length || 0,
      totalTokenUsage,
      totalCost,
      totalRevenue: subscriptionRevenue,
      features: featureData,
      models: modelData
    };
  }

  /**
   * Run growth simulation (FR-35)
   */
  async runGrowthSimulation(simulation, baseData) {
    const { parameters } = simulation;
    const { startDate, endDate, growth } = parameters;

    const months = this.getMonthsBetweenDates(startDate, endDate);
    const monthlyProjections = [];

    let currentUsers = baseData.totalUsers;
    let currentTokens = baseData.totalTokenUsage;
    let currentCost = baseData.totalCost;
    let currentRevenue = baseData.totalRevenue;

    for (let i = 0; i < months.length; i++) {
      const month = months[i];

      // Calculate user growth
      const newUsers = Math.round(currentUsers * (growth.userGrowthRate / 100) + growth.newUsersPerMonth);
      const churnedUsers = Math.round(currentUsers * (growth.churnRate / 100));
      currentUsers = Math.max(0, currentUsers + newUsers - churnedUsers);

      // Calculate token usage growth
      const tokenGrowth = currentTokens * (growth.tokenUsageGrowthRate / 100);
      currentTokens += tokenGrowth;

      // Calculate costs (assuming proportional to tokens)
      const tokenCostRatio = baseData.totalCost / (baseData.totalTokenUsage || 1);
      currentCost = currentTokens * tokenCostRatio;

      // Calculate revenue
      const arpu = parameters.revenueForecast?.averageRevenuePerUser || 0;
      currentRevenue = currentUsers * arpu;

      // Calculate profit
      const grossProfit = currentRevenue - currentCost;
      const netProfit = grossProfit * 0.85; // Account for operational costs

      monthlyProjections.push({
        month: month.month,
        year: month.year,
        date: month.date,
        users: {
          total: currentUsers,
          active: Math.round(currentUsers * 0.8),
          new: newUsers,
          churned: churnedUsers
        },
        tokens: {
          input: Math.round(currentTokens * 0.6),
          output: Math.round(currentTokens * 0.4),
          total: Math.round(currentTokens)
        },
        costs: {
          tokenCost: currentCost,
          infrastructureCost: parameters.operationalExpenses?.infrastructureCost || 0,
          operationalCost: (parameters.operationalExpenses?.laborCosts || 0) + (parameters.operationalExpenses?.otherCosts || 0),
          totalCost: currentCost + (parameters.operationalExpenses?.infrastructureCost || 0)
        },
        revenue: {
          subscription: currentRevenue * 0.7,
          usage: currentRevenue * 0.3,
          total: currentRevenue
        },
        profit: {
          gross: grossProfit,
          net: netProfit,
          margin: currentRevenue > 0 ? (netProfit / currentRevenue) * 100 : 0
        }
      });
    }

    return this.calculateSummary(monthlyProjections, baseData);
  }

  /**
   * Run pricing change simulation (FR-36)
   */
  async runPricingChangeSimulation(simulation, baseData) {
    const { parameters } = simulation;
    const { startDate, endDate, pricingChange } = parameters;

    const months = this.getMonthsBetweenDates(startDate, endDate);
    const monthlyProjections = [];

    const effectiveDate = pricingChange.effectiveDate || startDate;

    // Calculate price change percentages
    const inputPriceChange = pricingChange.currentInputPrice > 0
      ? ((pricingChange.newInputPrice - pricingChange.currentInputPrice) / pricingChange.currentInputPrice) * 100
      : 0;
    const outputPriceChange = pricingChange.currentOutputPrice > 0
      ? ((pricingChange.newOutputPrice - pricingChange.currentOutputPrice) / pricingChange.currentOutputPrice) * 100
      : 0;

    let currentTokens = baseData.totalTokenUsage;
    let baseCost = baseData.totalCost;

    for (let i = 0; i < months.length; i++) {
      const month = months[i];
      const isAfterEffectiveDate = month.date >= effectiveDate;

      // Apply new pricing after effective date
      let costMultiplier = 1;
      if (isAfterEffectiveDate) {
        const avgPriceChange = (inputPriceChange + outputPriceChange) / 2;
        costMultiplier = 1 + (avgPriceChange / 100);
      }

      const projectedCost = baseCost * costMultiplier;
      const projectedRevenue = baseData.totalRevenue * (isAfterEffectiveDate ? (1 + parameters.revenueForecast.revenueGrowthRate / 100) : 1);
      const profit = projectedRevenue - projectedCost;

      monthlyProjections.push({
        month: month.month,
        year: month.year,
        date: month.date,
        users: {
          total: baseData.totalUsers,
          active: baseData.activeUsers,
          new: 0,
          churned: 0
        },
        tokens: {
          input: Math.round(currentTokens * 0.6),
          output: Math.round(currentTokens * 0.4),
          total: Math.round(currentTokens)
        },
        costs: {
          tokenCost: projectedCost,
          infrastructureCost: parameters.operationalExpenses?.infrastructureCost || 0,
          operationalCost: 0,
          totalCost: projectedCost
        },
        revenue: {
          subscription: projectedRevenue * 0.7,
          usage: projectedRevenue * 0.3,
          total: projectedRevenue
        },
        profit: {
          gross: profit,
          net: profit * 0.85,
          margin: projectedRevenue > 0 ? (profit / projectedRevenue) * 100 : 0
        },
        metadata: {
          priceChangeApplied: isAfterEffectiveDate,
          inputPriceChange: isAfterEffectiveDate ? inputPriceChange : 0,
          outputPriceChange: isAfterEffectiveDate ? outputPriceChange : 0
        }
      });
    }

    return this.calculateSummary(monthlyProjections, baseData);
  }

  /**
   * Run expense forecast simulation (FR-37)
   */
  async runExpenseForecastSimulation(simulation, baseData) {
    const { parameters } = simulation;
    const { startDate, endDate, operationalExpenses, growth } = parameters;

    const months = this.getMonthsBetweenDates(startDate, endDate);
    const monthlyProjections = [];

    let currentInfrastructureCost = operationalExpenses.infrastructureCost;
    let currentLaborCost = operationalExpenses.laborCosts;
    let currentOtherCost = operationalExpenses.otherCosts;
    let currentTokens = baseData.totalTokenUsage;
    let currentTokenCost = baseData.totalCost;

    const optimizationFactor = operationalExpenses.costOptimizationFactor / 100;

    for (let i = 0; i < months.length; i++) {
      const month = months[i];

      // Apply growth rates
      currentInfrastructureCost *= (1 + (operationalExpenses.infrastructureGrowthRate / 100));
      currentTokenCost *= (1 + (growth.tokenUsageGrowthRate / 100));
      currentTokens *= (1 + (growth.tokenUsageGrowthRate / 100));

      // Apply cost optimization after first month
      if (i > 0) {
        currentInfrastructureCost *= (1 - optimizationFactor / 12);
      }

      const totalCost = currentTokenCost + currentInfrastructureCost + currentLaborCost + currentOtherCost;
      const projectedRevenue = baseData.totalRevenue * (1 + (parameters.revenueForecast.revenueGrowthRate / 100 * i / 12));

      monthlyProjections.push({
        month: month.month,
        year: month.year,
        date: month.date,
        users: {
          total: baseData.totalUsers,
          active: baseData.activeUsers,
          new: 0,
          churned: 0
        },
        tokens: {
          input: Math.round(currentTokens * 0.6),
          output: Math.round(currentTokens * 0.4),
          total: Math.round(currentTokens)
        },
        costs: {
          tokenCost: currentTokenCost,
          infrastructureCost: currentInfrastructureCost,
          operationalCost: currentLaborCost + currentOtherCost,
          totalCost: totalCost
        },
        revenue: {
          subscription: projectedRevenue * 0.7,
          usage: projectedRevenue * 0.3,
          total: projectedRevenue
        },
        profit: {
          gross: projectedRevenue - totalCost,
          net: (projectedRevenue - totalCost) * 0.85,
          margin: projectedRevenue > 0 ? ((projectedRevenue - totalCost) / projectedRevenue) * 100 : 0
        }
      });
    }

    return this.calculateSummary(monthlyProjections, baseData);
  }

  /**
   * Run revenue forecast simulation (FR-38)
   */
  async runRevenueForecastSimulation(simulation, baseData) {
    const { parameters } = simulation;
    const { startDate, endDate, revenueForecast, growth } = parameters;

    const months = this.getMonthsBetweenDates(startDate, endDate);
    const monthlyProjections = [];

    let currentSubscriptionRevenue = revenueForecast.subscriptionRevenue;
    let currentUsageRevenue = revenueForecast.usageBasedRevenue;
    let currentUsers = baseData.totalUsers;
    let currentTokens = baseData.totalTokenUsage;
    let currentCost = baseData.totalCost;

    for (let i = 0; i < months.length; i++) {
      const month = months[i];

      // Apply revenue growth
      currentSubscriptionRevenue *= (1 + (revenueForecast.revenueGrowthRate / 100 / 12));
      currentUsageRevenue *= (1 + (revenueForecast.revenueGrowthRate / 100 / 12));

      // Apply user growth
      currentUsers *= (1 + (growth.userGrowthRate / 100 / 12));

      // Calculate usage revenue based on token markup
      const markupMultiplier = 1 + (revenueForecast.tokenPriceMarkup / 100);
      currentUsageRevenue = currentCost * markupMultiplier;

      const totalRevenue = currentSubscriptionRevenue + currentUsageRevenue;

      // Cost grows with tokens
      currentTokens *= (1 + (growth.tokenUsageGrowthRate / 100 / 12));
      currentCost = baseData.totalCost * (currentTokens / baseData.totalTokenUsage);

      const profit = totalRevenue - currentCost;

      monthlyProjections.push({
        month: month.month,
        year: month.year,
        date: month.date,
        users: {
          total: Math.round(currentUsers),
          active: Math.round(currentUsers * 0.8),
          new: Math.round(currentUsers * (growth.userGrowthRate / 100 / 12)),
          churned: Math.round(currentUsers * (growth.churnRate / 100 / 12))
        },
        tokens: {
          input: Math.round(currentTokens * 0.6),
          output: Math.round(currentTokens * 0.4),
          total: Math.round(currentTokens)
        },
        costs: {
          tokenCost: currentCost,
          infrastructureCost: parameters.operationalExpenses?.infrastructureCost || 0,
          operationalCost: 0,
          totalCost: currentCost
        },
        revenue: {
          subscription: currentSubscriptionRevenue,
          usage: currentUsageRevenue,
          total: totalRevenue
        },
        profit: {
          gross: profit,
          net: profit * 0.85,
          margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
        }
      });
    }

    return this.calculateSummary(monthlyProjections, baseData);
  }

  /**
   * Run custom simulation
   */
  async runCustomSimulation(simulation, baseData) {
    // Custom simulations use a combination of all parameters
    const { parameters } = simulation;
    const { startDate, endDate } = parameters;

    const months = this.getMonthsBetweenDates(startDate, endDate);
    const monthlyProjections = [];

    let currentUsers = baseData.totalUsers;
    let currentTokens = baseData.totalTokenUsage;
    let currentCost = baseData.totalCost;
    let currentRevenue = baseData.totalRevenue;

    for (let i = 0; i < months.length; i++) {
      const month = months[i];

      // Apply all growth factors
      currentUsers *= (1 + (parameters.growth.userGrowthRate / 100 / 12));
      currentTokens *= (1 + (parameters.growth.tokenUsageGrowthRate / 100 / 12));
      currentCost *= (1 + (parameters.growth.tokenUsageGrowthRate / 100 / 12));
      currentRevenue *= (1 + (parameters.revenueForecast.revenueGrowthRate / 100 / 12));

      // Apply cost optimization
      currentCost *= (1 - (parameters.operationalExpenses.costOptimizationFactor / 100 / 12));

      const totalCost = currentCost + (parameters.operationalExpenses.infrastructureCost || 0);
      const profit = currentRevenue - totalCost;

      monthlyProjections.push({
        month: month.month,
        year: month.year,
        date: month.date,
        users: {
          total: Math.round(currentUsers),
          active: Math.round(currentUsers * 0.8),
          new: Math.round(currentUsers * (parameters.growth.userGrowthRate / 100 / 12)),
          churned: Math.round(currentUsers * (parameters.growth.churnRate / 100 / 12))
        },
        tokens: {
          input: Math.round(currentTokens * 0.6),
          output: Math.round(currentTokens * 0.4),
          total: Math.round(currentTokens)
        },
        costs: {
          tokenCost: currentCost,
          infrastructureCost: parameters.operationalExpenses.infrastructureCost || 0,
          operationalCost: (parameters.operationalExpenses.laborCosts || 0) + (parameters.operationalExpenses.otherCosts || 0),
          totalCost: totalCost
        },
        revenue: {
          subscription: currentRevenue * 0.7,
          usage: currentRevenue * 0.3,
          total: currentRevenue
        },
        profit: {
          gross: profit,
          net: profit * 0.85,
          margin: currentRevenue > 0 ? (profit / currentRevenue) * 100 : 0
        }
      });
    }

    return this.calculateSummary(monthlyProjections, baseData);
  }

  /**
   * Calculate summary from monthly projections
   */
  calculateSummary(monthlyProjections, baseData) {
    const totalProjectedUsers = monthlyProjections[monthlyProjections.length - 1]?.users?.total || 0;
    const totalProjectedTokens = monthlyProjections.reduce((sum, m) => sum + (m.tokens?.total || 0), 0);
    const totalProjectedCost = monthlyProjections.reduce((sum, m) => sum + (m.costs?.totalCost || 0), 0);
    const totalProjectedRevenue = monthlyProjections.reduce((sum, m) => sum + (m.revenue?.total || 0), 0);
    const totalProjectedProfit = monthlyProjections.reduce((sum, m) => sum + (m.profit?.net || 0), 0);
    const averageMonthlyProfit = totalProjectedProfit / monthlyProjections.length;

    // Calculate comparison with baseline
    const costChange = baseData.totalCost > 0
      ? ((totalProjectedCost / monthlyProjections.length) - baseData.totalCost) / baseData.totalCost * 100
      : 0;
    const revenueChange = baseData.totalRevenue > 0
      ? ((totalProjectedRevenue / monthlyProjections.length) - baseData.totalRevenue) / baseData.totalRevenue * 100
      : 0;

    // Calculate break-even users
    const avgCostPerUser = totalProjectedCost / (totalProjectedUsers || 1);
    const avgRevenuePerUser = totalProjectedRevenue / (totalProjectedUsers || 1);
    const fixedCosts = monthlyProjections[0]?.costs?.infrastructureCost || 0;
    const breakEvenUsers = avgRevenuePerUser > avgCostPerUser
      ? Math.ceil(fixedCosts / (avgRevenuePerUser - avgCostPerUser))
      : 0;

    // Generate chart data
    const chartData = {
      users: monthlyProjections.map(m => ({ x: `${m.month}/${m.year}`, y: m.users?.total || 0 })),
      revenue: monthlyProjections.map(m => ({ x: `${m.month}/${m.year}`, y: m.revenue?.total || 0 })),
      costs: monthlyProjections.map(m => ({ x: `${m.month}/${m.year}`, y: m.costs?.totalCost || 0 })),
      profit: monthlyProjections.map(m => ({ x: `${m.month}/${m.year}`, y: m.profit?.net || 0 })),
      margin: monthlyProjections.map(m => ({ x: `${m.month}/${m.year}`, y: m.profit?.margin || 0 }))
    };

    return {
      monthlyProjections,
      summary: {
        totalProjectedUsers,
        totalProjectedTokens,
        totalProjectedCost,
        totalProjectedRevenue,
        totalProjectedProfit,
        averageMonthlyProfit,
        profitMargin: totalProjectedRevenue > 0 ? (totalProjectedProfit / totalProjectedRevenue) * 100 : 0,
        breakEvenUsers,
        roi: baseData.totalCost > 0 ? ((totalProjectedProfit - baseData.totalCost) / baseData.totalCost) * 100 : 0,
        costSavings: Math.max(0, baseData.totalCost * monthlyProjections.length - totalProjectedCost)
      },
      comparison: {
        costChange,
        revenueChange,
        profitChange: revenueChange - costChange,
        userGrowthAchieved: baseData.totalUsers > 0 ? ((totalProjectedUsers - baseData.totalUsers) / baseData.totalUsers) * 100 : 0
      },
      chartData
    };
  }

  /**
   * Get months between two dates
   */
  getMonthsBetweenDates(startDate, endDate) {
    const months = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      months.push({
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Compare multiple simulations (FR-39)
   * @param {Array} simulationIds - Array of simulation IDs
   * @returns {Object} Comparison results
   */
  async compareSimulations(simulationIds) {
    const simulations = await Simulation.find({
      _id: { $in: simulationIds },
      status: 'completed'
    }).populate('createdBy', 'firstName lastName');

    if (simulations.length < 2) {
      throw new AppError('At least 2 completed simulations are required for comparison', 400, 'INSUFFICIENT_DATA');
    }

    const comparison = {
      simulations: simulations.map(s => ({
        id: s._id,
        name: s.name,
        type: s.type,
        summary: s.results.summary
      })),
      metrics: {
        bestProfitMargin: null,
        bestROI: null,
        lowestCost: null,
        highestRevenue: null
      },
      chartData: {
        profitComparison: [],
        costComparison: [],
        revenueComparison: []
      }
    };

    // Find best performers
    const sortedByProfit = [...simulations].sort((a, b) =>
      (b.results.summary?.profitMargin || 0) - (a.results.summary?.profitMargin || 0)
    );
    const sortedByROI = [...simulations].sort((a, b) =>
      (b.results.summary?.roi || 0) - (a.results.summary?.roi || 0)
    );
    const sortedByCost = [...simulations].sort((a, b) =>
      (a.results.summary?.totalProjectedCost || 0) - (b.results.summary?.totalProjectedCost || 0)
    );
    const sortedByRevenue = [...simulations].sort((a, b) =>
      (b.results.summary?.totalProjectedRevenue || 0) - (a.results.summary?.totalProjectedRevenue || 0)
    );

    comparison.metrics.bestProfitMargin = {
      simulationId: sortedByProfit[0]._id,
      name: sortedByProfit[0].name,
      value: sortedByProfit[0].results.summary?.profitMargin || 0
    };
    comparison.metrics.bestROI = {
      simulationId: sortedByROI[0]._id,
      name: sortedByROI[0].name,
      value: sortedByROI[0].results.summary?.roi || 0
    };
    comparison.metrics.lowestCost = {
      simulationId: sortedByCost[0]._id,
      name: sortedByCost[0].name,
      value: sortedByCost[0].results.summary?.totalProjectedCost || 0
    };
    comparison.metrics.highestRevenue = {
      simulationId: sortedByRevenue[0]._id,
      name: sortedByRevenue[0].name,
      value: sortedByRevenue[0].results.summary?.totalProjectedRevenue || 0
    };

    // Generate comparison chart data
    simulations.forEach(s => {
      if (s.results.chartData) {
        comparison.chartData.profitComparison.push({
          name: s.name,
          data: s.results.chartData.profit || []
        });
        comparison.chartData.costComparison.push({
          name: s.name,
          data: s.results.chartData.costs || []
        });
        comparison.chartData.revenueComparison.push({
          name: s.name,
          data: s.results.chartData.revenue || []
        });
      }
    });

    return comparison;
  }

  /**
   * Get simulation statistics
   * @param {string} organizationId - Organization ID
   * @returns {Object} Statistics
   */
  async getStatistics(organizationId) {
    return await Simulation.getStatistics(organizationId);
  }

  /**
   * Duplicate simulation
   * @param {string} simulationId - Simulation ID
   * @param {string} userId - User ID
   * @returns {Object} Duplicated simulation
   */
  async duplicate(simulationId, userId) {
    const simulation = await Simulation.findById(simulationId);

    if (!simulation) {
      throw new AppError('Simulation not found', 404, 'NOT_FOUND');
    }

    const duplicate = await simulation.duplicate(userId);

    logger.info(`Simulation duplicated: ${simulationId} -> ${duplicate._id}`);

    return duplicate;
  }

  /**
   * Run scenario comparison (FR-39 enhanced)
   * @param {string} organizationId - Organization ID
   * @param {Object} scenarios - Scenarios to compare
   * @returns {Object} Comparison results
   */
  async runScenarioComparison(organizationId, scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      const simulation = await Simulation.create({
        organization: organizationId,
        name: scenario.name || `Scenario ${results.length + 1}`,
        type: scenario.type || 'custom',
        parameters: scenario.parameters,
        status: 'running',
        createdBy: scenario.userId
      });

      try {
        const baseData = await this.gatherBaseData(simulation);
        let scenarioResults;

        switch (simulation.type) {
          case 'growth':
            scenarioResults = await this.runGrowthSimulation(simulation, baseData);
            break;
          case 'pricing_change':
            scenarioResults = await this.runPricingChangeSimulation(simulation, baseData);
            break;
          case 'expense_forecast':
            scenarioResults = await this.runExpenseForecastSimulation(simulation, baseData);
            break;
          case 'revenue_forecast':
            scenarioResults = await this.runRevenueForecastSimulation(simulation, baseData);
            break;
          default:
            scenarioResults = await this.runCustomSimulation(simulation, baseData);
        }

        results.push({
          name: simulation.name,
          type: simulation.type,
          summary: scenarioResults.summary,
          comparison: scenarioResults.comparison,
          projections: scenarioResults.monthlyProjections
        });

        // Clean up temporary simulation
        await Simulation.findByIdAndDelete(simulation._id);
      } catch (error) {
        logger.error(`Scenario comparison failed for ${simulation._id}:`, error);
      }
    }

    return this.generateScenarioComparisonReport(results);
  }

  /**
   * Generate scenario comparison report
   */
  generateScenarioComparisonReport(results) {
    if (results.length === 0) {
      return { scenarios: [], summary: {}, recommendations: [] };
    }

    // Sort by different metrics
    const byProfit = [...results].sort((a, b) =>
      (b.summary?.totalProjectedProfit || 0) - (a.summary?.totalProjectedProfit || 0)
    );
    const byRevenue = [...results].sort((a, b) =>
      (b.summary?.totalProjectedRevenue || 0) - (a.summary?.totalProjectedRevenue || 0)
    );
    const byMargin = [...results].sort((a, b) =>
      (b.summary?.profitMargin || 0) - (a.summary?.profitMargin || 0)
    );
    const byCost = [...results].sort((a, b) =>
      (a.summary?.totalProjectedCost || 0) - (b.summary?.totalProjectedCost || 0)
    );

    // Calculate averages
    const avgProfit = results.reduce((sum, r) => sum + (r.summary?.totalProjectedProfit || 0), 0) / results.length;
    const avgRevenue = results.reduce((sum, r) => sum + (r.summary?.totalProjectedRevenue || 0), 0) / results.length;
    const avgCost = results.reduce((sum, r) => sum + (r.summary?.totalProjectedCost || 0), 0) / results.length;
    const avgMargin = results.reduce((sum, r) => sum + (r.summary?.profitMargin || 0), 0) / results.length;

    // Generate recommendations
    const recommendations = [];

    if (byProfit[0] !== byMargin[0]) {
      recommendations.push({
        type: 'profit_optimization',
        message: `Best profit scenario (${byProfit[0].name}) differs from best margin scenario (${byMargin[0].name}). Consider balance between scale and efficiency.`
      });
    }

    const highCostScenarios = results.filter(r => (r.summary?.totalProjectedCost || 0) > avgCost * 1.2);
    if (highCostScenarios.length > 0) {
      recommendations.push({
        type: 'cost_alert',
        message: `${highCostScenarios.length} scenario(s) exceed average cost by 20%. Review cost drivers.`
      });
    }

    const lowMarginScenarios = results.filter(r => (r.summary?.profitMargin || 0) < 15);
    if (lowMarginScenarios.length > 0) {
      recommendations.push({
        type: 'margin_warning',
        message: `${lowMarginScenarios.length} scenario(s) have margins below 15%. Consider pricing adjustments.`
      });
    }

    return {
      scenarios: results,
      ranking: {
        byProfit: byProfit.map(r => ({ name: r.name, value: r.summary?.totalProjectedProfit || 0 })),
        byRevenue: byRevenue.map(r => ({ name: r.name, value: r.summary?.totalProjectedRevenue || 0 })),
        byMargin: byMargin.map(r => ({ name: r.name, value: r.summary?.profitMargin || 0 })),
        byCost: byCost.map(r => ({ name: r.name, value: r.summary?.totalProjectedCost || 0 }))
      },
      averages: {
        profit: avgProfit,
        revenue: avgRevenue,
        cost: avgCost,
        margin: avgMargin
      },
      bestScenario: {
        overall: byProfit[0].name,
        byProfit: byProfit[0].name,
        byRevenue: byRevenue[0].name,
        byMargin: byMargin[0].name,
        byCost: byCost[0].name
      },
      recommendations
    };
  }

  /**
   * Run sensitivity analysis
   * @param {string} organizationId - Organization ID
   * @param {Object} baseParameters - Base parameters
   * @param {Array} variables - Variables to analyze
   * @returns {Object} Sensitivity analysis results
   */
  async runSensitivityAnalysis(organizationId, baseParameters, variables) {
    const organization = await Organization.findById(organizationId);
    const baseData = await this.gatherBaseData({ organization: organizationId, parameters: baseParameters });
    const results = [];

    for (const variable of variables) {
      const { name, range, steps = 5 } = variable;
      const sensitivityResults = [];

      const min = range[0];
      const max = range[1];
      const stepSize = (max - min) / (steps - 1);

      for (let i = 0; i < steps; i++) {
        const value = min + (stepSize * i);
        const modifiedParams = { ...baseParameters };
        this.setNestedValue(modifiedParams, name, value);

        const simulation = {
          organization: organizationId,
          parameters: modifiedParams,
          type: baseParameters.type || 'custom'
        };

        let simResults;
        switch (simulation.type) {
          case 'growth':
            simResults = await this.runGrowthSimulation(simulation, baseData);
            break;
          case 'pricing_change':
            simResults = await this.runPricingChangeSimulation(simulation, baseData);
            break;
          case 'expense_forecast':
            simResults = await this.runExpenseForecastSimulation(simulation, baseData);
            break;
          case 'revenue_forecast':
            simResults = await this.runRevenueForecastSimulation(simulation, baseData);
            break;
          default:
            simResults = await this.runCustomSimulation(simulation, baseData);
        }

        sensitivityResults.push({
          value,
          profit: simResults.summary?.totalProjectedProfit || 0,
          revenue: simResults.summary?.totalProjectedRevenue || 0,
          cost: simResults.summary?.totalProjectedCost || 0,
          margin: simResults.summary?.profitMargin || 0
        });
      }

      // Calculate sensitivity coefficient
      const profits = sensitivityResults.map(r => r.profit);
      const maxProfit = Math.max(...profits);
      const minProfit = Math.min(...profits);
      const profitRange = maxProfit - minProfit;
      const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;

      results.push({
        variable: name,
        range: { min, max },
        results: sensitivityResults,
        sensitivity: {
          impact: profitRange,
          impactPercent: avgProfit > 0 ? (profitRange / avgProfit) * 100 : 0,
          direction: profits[profits.length - 1] > profits[0] ? 'positive' : 'negative'
        }
      });
    }

    // Sort by impact
    results.sort((a, b) => b.sensitivity.impact - a.sensitivity.impact);

    return {
      variables: results,
      mostSensitive: results[0]?.variable,
      leastSensitive: results[results.length - 1]?.variable,
      summary: {
        totalVariables: results.length,
        highSensitivity: results.filter(r => r.sensitivity.impactPercent > 20).length,
        mediumSensitivity: results.filter(r => r.sensitivity.impactPercent >= 10 && r.sensitivity.impactPercent <= 20).length,
        lowSensitivity: results.filter(r => r.sensitivity.impactPercent < 10).length
      }
    };
  }

  /**
   * Run Monte Carlo simulation for risk analysis
   * @param {string} organizationId - Organization ID
   * @param {Object} baseParameters - Base parameters
   * @param {Object} uncertainties - Uncertainty ranges
   * @param {number} iterations - Number of iterations
   * @returns {Object} Monte Carlo results
   */
  async runMonteCarloSimulation(organizationId, baseParameters, uncertainties, iterations = 1000) {
    const baseData = await this.gatherBaseData({ organization: organizationId, parameters: baseParameters });
    const results = [];

    for (let i = 0; i < iterations; i++) {
      // Generate random values within uncertainty ranges
      const modifiedParams = { ...baseParameters };

      for (const [key, range] of Object.entries(uncertainties)) {
        const randomValue = range.min + (Math.random() * (range.max - range.min));
        this.setNestedValue(modifiedParams, key, randomValue);
      }

      const simulation = {
        organization: organizationId,
        parameters: modifiedParams,
        type: baseParameters.type || 'custom'
      };

      let simResults;
      switch (simulation.type) {
        case 'growth':
          simResults = await this.runGrowthSimulation(simulation, baseData);
          break;
        case 'pricing_change':
          simResults = await this.runPricingChangeSimulation(simulation, baseData);
          break;
        case 'expense_forecast':
          simResults = await this.runExpenseForecastSimulation(simulation, baseData);
          break;
        case 'revenue_forecast':
          simResults = await this.runRevenueForecastSimulation(simulation, baseData);
          break;
        default:
          simResults = await this.runCustomSimulation(simulation, baseData);
      }

      results.push({
        profit: simResults.summary?.totalProjectedProfit || 0,
        revenue: simResults.summary?.totalProjectedRevenue || 0,
        cost: simResults.summary?.totalProjectedCost || 0,
        margin: simResults.summary?.profitMargin || 0
      });
    }

    // Calculate statistics
    const profits = results.map(r => r.profit);
    const revenues = results.map(r => r.revenue);
    const costs = results.map(r => r.cost);
    const margins = results.map(r => r.margin);

    const profitStats = this.calculateStatistics(profits);
    const revenueStats = this.calculateStatistics(revenues);
    const costStats = this.calculateStatistics(costs);
    const marginStats = this.calculateStatistics(margins);

    // Calculate risk metrics
    const profitAtRisk = profits.filter(p => p < 0).length / iterations;
    const valueAtRisk5 = this.percentile(profits, 5);
    const valueAtRisk1 = this.percentile(profits, 1);
    const expectedShortfall = profits.filter(p => p < valueAtRisk5).reduce((a, b) => a + b, 0) / profits.filter(p => p < valueAtRisk5).length || 0;

    return {
      iterations,
      statistics: {
        profit: profitStats,
        revenue: revenueStats,
        cost: costStats,
        margin: marginStats
      },
      riskMetrics: {
        probabilityOfLoss: profitAtRisk,
        valueAtRisk5,
        valueAtRisk1,
        expectedShortfall,
        confidenceInterval95: [profitStats.p5, profitStats.p95]
      },
      distribution: this.createHistogram(profits, 20),
      scenarios: {
        worstCase: this.percentile(profits, 1),
        pessimistic: this.percentile(profits, 25),
        expected: profitStats.median,
        optimistic: this.percentile(profits, 75),
        bestCase: this.percentile(profits, 99)
      }
    };
  }

  /**
   * Calculate statistics for a dataset
   */
  calculateStatistics(data) {
    if (data.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, p5: 0, p25: 0, p75: 0, p95: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p5: this.percentile(sorted, 5),
      p25: this.percentile(sorted, 25),
      p75: this.percentile(sorted, 75),
      p95: this.percentile(sorted, 95)
    };
  }

  /**
   * Get percentile from sorted data
   */
  percentile(sortedData, p) {
    if (sortedData.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedData.length) - 1;
    return sortedData[Math.max(0, Math.min(index, sortedData.length - 1))];
  }

  /**
   * Create histogram data
   */
  createHistogram(data, bins = 20) {
    if (data.length === 0) return [];

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const binSize = range / bins || 1;

    const histogram = Array(bins).fill(0);

    for (const value of data) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex]++;
    }

    return histogram.map((count, i) => ({
      bin: `${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`,
      count,
      frequency: count / data.length
    }));
  }

  /**
   * Set nested value in object
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /**
   * Generate revenue forecast with multiple scenarios
   * @param {string} organizationId - Organization ID
   * @param {Object} parameters - Forecast parameters
   * @returns {Object} Multi-scenario forecast
   */
  async generateRevenueForecast(organizationId, parameters) {
    const scenarios = {
      conservative: {
        userGrowthRate: (parameters.growth?.userGrowthRate || 10) * 0.5,
        churnRate: (parameters.growth?.churnRate || 5) * 1.5,
        revenueGrowthRate: (parameters.revenueForecast?.revenueGrowthRate || 15) * 0.5
      },
      baseline: {
        userGrowthRate: parameters.growth?.userGrowthRate || 10,
        churnRate: parameters.growth?.churnRate || 5,
        revenueGrowthRate: parameters.revenueForecast?.revenueGrowthRate || 15
      },
      optimistic: {
        userGrowthRate: (parameters.growth?.userGrowthRate || 10) * 1.5,
        churnRate: (parameters.growth?.churnRate || 5) * 0.5,
        revenueGrowthRate: (parameters.revenueForecast?.revenueGrowthRate || 15) * 1.5
      }
    };

    const results = {};

    for (const [scenarioName, scenarioParams] of Object.entries(scenarios)) {
      const modifiedParams = {
        ...parameters,
        growth: {
          ...parameters.growth,
          ...scenarioParams
        },
        revenueForecast: {
          ...parameters.revenueForecast,
          revenueGrowthRate: scenarioParams.revenueGrowthRate
        }
      };

      const simulation = {
        organization: organizationId,
        parameters: modifiedParams,
        type: 'revenue_forecast'
      };

      const baseData = await this.gatherBaseData(simulation);
      results[scenarioName] = await this.runRevenueForecastSimulation(simulation, baseData);
    }

    // Generate comparison chart data
    const months = results.baseline.monthlyProjections.map(m => `${m.month}/${m.year}`);

    return {
      scenarios: results,
      comparison: {
        timeline: months,
        revenue: {
          conservative: results.conservative.monthlyProjections.map(m => m.revenue?.total || 0),
          baseline: results.baseline.monthlyProjections.map(m => m.revenue?.total || 0),
          optimistic: results.optimistic.monthlyProjections.map(m => m.revenue?.total || 0)
        },
        profit: {
          conservative: results.conservative.monthlyProjections.map(m => m.profit?.net || 0),
          baseline: results.baseline.monthlyProjections.map(m => m.profit?.net || 0),
          optimistic: results.optimistic.monthlyProjections.map(m => m.profit?.net || 0)
        },
        users: {
          conservative: results.conservative.monthlyProjections.map(m => m.users?.total || 0),
          baseline: results.baseline.monthlyProjections.map(m => m.users?.total || 0),
          optimistic: results.optimistic.monthlyProjections.map(m => m.users?.total || 0)
        }
      },
      summary: {
        conservative: {
          totalRevenue: results.conservative.summary.totalProjectedRevenue,
          totalProfit: results.conservative.summary.totalProjectedProfit,
          profitMargin: results.conservative.summary.profitMargin
        },
        baseline: {
          totalRevenue: results.baseline.summary.totalProjectedRevenue,
          totalProfit: results.baseline.summary.totalProjectedProfit,
          profitMargin: results.baseline.summary.profitMargin
        },
        optimistic: {
          totalRevenue: results.optimistic.summary.totalProjectedRevenue,
          totalProfit: results.optimistic.summary.totalProjectedProfit,
          profitMargin: results.optimistic.summary.profitMargin
        }
      },
      recommendations: this.generateForecastRecommendations(results)
    };
  }

  /**
   * Generate recommendations based on forecast results
   */
  generateForecastRecommendations(results) {
    const recommendations = [];

    // Profit margin analysis
    const conservativeMargin = results.conservative.summary.profitMargin || 0;
    const baselineMargin = results.baseline.summary.profitMargin || 0;
    const optimisticMargin = results.optimistic.summary.profitMargin || 0;

    if (conservativeMargin < 10) {
      recommendations.push({
        type: 'margin_warning',
        severity: 'high',
        message: 'Conservative scenario shows margins below 10%. Review cost structure and pricing strategy.'
      });
    }

    if (baselineMargin < 20) {
      recommendations.push({
        type: 'margin_improvement',
        severity: 'medium',
        message: 'Consider optimizing costs or adjusting pricing to improve baseline margins above 20%.'
      });
    }

    // Revenue gap analysis
    const revenueGap = (results.optimistic.summary.totalProjectedRevenue || 0) - (results.conservative.summary.totalProjectedRevenue || 0);
    const revenueVariability = revenueGap / (results.baseline.summary.totalProjectedRevenue || 1);

    if (revenueVariability > 0.5) {
      recommendations.push({
        type: 'variability_alert',
        severity: 'medium',
        message: 'High revenue variability between scenarios. Focus on reducing uncertainty through better forecasting.'
      });
    }

    // Growth potential
    const growthPotential = ((results.optimistic.summary.totalProjectedProfit || 0) - (results.conservative.summary.totalProjectedProfit || 0)) / 2;
    if (growthPotential > (results.baseline.summary.totalProjectedProfit || 0) * 0.3) {
      recommendations.push({
        type: 'growth_opportunity',
        severity: 'low',
        message: 'Significant upside potential. Consider investments that could shift results toward optimistic scenario.'
      });
    }

    return recommendations;
  }
}

export default new SimulationService();