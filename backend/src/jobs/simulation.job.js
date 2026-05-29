/**
 * Simulation Job Processor
 *
 * Processes simulation jobs from the simulation queue.
 */

import logger from '../config/logger.js';
import Simulation from '../models/Simulation.js';
import simulationService from '../services/simulation.service.js';

/**
 * Simulation types
 */
const SIMULATION_TYPES = {
  USER_GROWTH: 'user_growth',
  PRICING_CHANGE: 'pricing_change',
  EXPENSE_FORECAST: 'expense_forecast',
  REVENUE_PROJECTION: 'revenue_projection',
  BREAK_EVEN: 'break_even',
  SCENARIO_COMPARISON: 'scenario_comparison',
  SENSITIVITY: 'sensitivity'
};

/**
 * Process simulation job
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>}
 */
async function processSimulationJob(data, job) {
  const {
    simulationId,
    organizationId,
    projectId,
    userId,
    type,
    parameters = {},
    options = {}
  } = data;

  logger.info(`Processing simulation job: ${type} for organization ${organizationId}`);

  try {
    // Update simulation status to processing
    if (simulationId) {
      await Simulation.findByIdAndUpdate(simulationId, {
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
      case SIMULATION_TYPES.USER_GROWTH:
        result = await simulationService.runUserGrowthSimulation(
          organizationId,
          projectId,
          parameters
        );
        break;

      case SIMULATION_TYPES.PRICING_CHANGE:
        result = await simulationService.runPricingChangeSimulation(
          organizationId,
          projectId,
          parameters
        );
        break;

      case SIMULATION_TYPES.EXPENSE_FORECAST:
        result = await simulationService.runExpenseForecast(
          organizationId,
          projectId,
          parameters
        );
        break;

      case SIMULATION_TYPES.REVENUE_PROJECTION:
        result = await simulationService.runRevenueProjection(
          organizationId,
          projectId,
          parameters
        );
        break;

      case SIMULATION_TYPES.BREAK_EVEN:
        result = await simulationService.runBreakEvenAnalysis(
          organizationId,
          projectId,
          parameters
        );
        break;

      case SIMULATION_TYPES.SCENARIO_COMPARISON:
        result = await simulationService.runScenarioComparison(
          organizationId,
          projectId,
          parameters
        );
        break;

      case SIMULATION_TYPES.SENSITIVITY:
        result = await simulationService.runSensitivityAnalysis(
          organizationId,
          projectId,
          parameters
        );
        break;

      default:
        throw new Error(`Unknown simulation type: ${type}`);
    }

    // Update job progress
    if (job) {
      job.progress(80);
    }

    // Calculate summary metrics
    const summary = calculateSummaryMetrics(result);

    // Update simulation status to completed
    if (simulationId) {
      await Simulation.findByIdAndUpdate(simulationId, {
        status: 'completed',
        completedAt: new Date(),
        results: result,
        summary
      });
    }

    logger.info(`Simulation job completed: ${type} for organization ${organizationId}`);

    return {
      success: true,
      simulationId,
      summary,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Simulation job failed: ${type}`, error.message);

    // Update simulation status to failed
    if (simulationId) {
      await Simulation.findByIdAndUpdate(simulationId, {
        status: 'failed',
        failedAt: new Date(),
        error: error.message
      });
    }

    throw error;
  }
}

/**
 * Calculate summary metrics from simulation results
 * @param {Object} result - Simulation results
 * @returns {Object}
 */
function calculateSummaryMetrics(result) {
  const summary = {
    totalScenarios: result.scenarios?.length || 1,
    bestCase: null,
    worstCase: null,
    averageOutcome: null
  };

  if (result.scenarios && result.scenarios.length > 0) {
    const outcomes = result.scenarios.map(s => s.outcome || s.value || 0);

    if (outcomes.length > 0) {
      summary.bestCase = Math.max(...outcomes);
      summary.worstCase = Math.min(...outcomes);
      summary.averageOutcome = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
    }
  }

  if (result.projections && result.projections.length > 0) {
    const finalProjection = result.projections[result.projections.length - 1];
    summary.finalValue = finalProjection.value || finalProjection.cost || finalProjection.revenue;
  }

  return summary;
}

/**
 * Register simulation processor with queue service
 * @param {Object} queueService - Queue service instance
 */
async function register(queueService) {
  await queueService.registerProcessor('simulation', processSimulationJob, 3);
  logger.info('Simulation job processor registered');
}

export default {
  process: processSimulationJob,
  register,
  SIMULATION_TYPES
};