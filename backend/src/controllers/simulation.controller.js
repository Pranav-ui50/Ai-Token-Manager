/**
 * Simulation Controller
 *
 * Handles simulation-related HTTP requests.
 */

import simulationService from '../services/simulation.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class SimulationController {
  /**
   * Create a new simulation
   * @route POST /api/simulations
   */
  async create(req, res, next) {
    try {
      const userId = req.user.userId;
      const simulation = await simulationService.create(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Simulation created successfully',
        data: simulation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get simulation by ID
   * @route GET /api/simulations/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const simulation = await simulationService.getById(id, userId);

      res.status(200).json({
        success: true,
        data: simulation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get simulations for organization
   * @route GET /api/simulations/organization/:organizationId
   */
  async getForOrganization(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { status, type } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (type) filters.type = type;

      const simulations = await simulationService.getForOrganization(organizationId, filters);

      res.status(200).json({
        success: true,
        count: simulations.length,
        data: simulations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update simulation
   * @route PUT /api/simulations/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const simulation = await simulationService.update(id, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'Simulation updated successfully',
        data: simulation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete simulation
   * @route DELETE /api/simulations/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      await simulationService.delete(id);

      res.status(200).json({
        success: true,
        message: 'Simulation deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run simulation
   * @route POST /api/simulations/:id/run
   */
  async run(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      logger.info(`Running simulation ${id} by user ${userId}`);

      const simulation = await simulationService.runSimulation(id, userId);

      res.status(200).json({
        success: true,
        message: 'Simulation completed successfully',
        data: simulation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare simulations
   * @route POST /api/simulations/compare
   */
  async compare(req, res, next) {
    try {
      const { simulationIds } = req.body;

      const comparison = await simulationService.compareSimulations(simulationIds);

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get simulation statistics
   * @route GET /api/simulations/statistics/:organizationId
   */
  async getStatistics(req, res, next) {
    try {
      const { organizationId } = req.params;

      const statistics = await simulationService.getStatistics(organizationId);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate simulation
   * @route POST /api/simulations/:id/duplicate
   */
  async duplicate(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const simulation = await simulationService.duplicate(id, userId);

      res.status(201).json({
        success: true,
        message: 'Simulation duplicated successfully',
        data: simulation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get simulation templates
   * @route GET /api/simulations/templates
   */
  async getTemplates(req, res, next) {
    try {
      const { organizationId } = req.query;

      const templates = await Simulation.findTemplates(organizationId);

      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run scenario comparison
   * @route POST /api/simulations/scenario-comparison
   */
  async runScenarioComparison(req, res, next) {
    try {
      const { organizationId, scenarios } = req.body;
      const userId = req.user.userId;

      if (!organizationId || !Array.isArray(scenarios) || scenarios.length < 2) {
        throw new AppError('Organization ID and at least 2 scenarios are required', 400, 'INVALID_INPUT');
      }

      logger.info(`Running scenario comparison for organization ${organizationId} by user ${userId}`);

      const comparison = await simulationService.runScenarioComparison(organizationId, scenarios);

      res.status(200).json({
        success: true,
        data: comparison
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run sensitivity analysis
   * @route POST /api/simulations/sensitivity-analysis
   */
  async runSensitivityAnalysis(req, res, next) {
    try {
      const { organizationId, baseParameters, variables } = req.body;

      if (!organizationId || !baseParameters || !Array.isArray(variables)) {
        throw new AppError('Organization ID, base parameters, and variables are required', 400, 'INVALID_INPUT');
      }

      logger.info(`Running sensitivity analysis for organization ${organizationId}`);

      const analysis = await simulationService.runSensitivityAnalysis(organizationId, baseParameters, variables);

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run Monte Carlo simulation
   * @route POST /api/simulations/monte-carlo
   */
  async runMonteCarlo(req, res, next) {
    try {
      const { organizationId, baseParameters, uncertainties, iterations = 1000 } = req.body;

      if (!organizationId || !baseParameters || !uncertainties) {
        throw new AppError('Organization ID, base parameters, and uncertainties are required', 400, 'INVALID_INPUT');
      }

      logger.info(`Running Monte Carlo simulation for organization ${organizationId} with ${iterations} iterations`);

      const results = await simulationService.runMonteCarloSimulation(organizationId, baseParameters, uncertainties, iterations);

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate revenue forecast
   * @route POST /api/simulations/revenue-forecast
   */
  async generateRevenueForecast(req, res, next) {
    try {
      const { organizationId, parameters } = req.body;

      if (!organizationId || !parameters) {
        throw new AppError('Organization ID and parameters are required', 400, 'INVALID_INPUT');
      }

      logger.info(`Generating revenue forecast for organization ${organizationId}`);

      const forecast = await simulationService.generateRevenueForecast(organizationId, parameters);

      res.status(200).json({
        success: true,
        data: forecast
      });
    } catch (error) {
      next(error);
    }
  }
}

import Simulation from '../models/Simulation.js';

export default new SimulationController();