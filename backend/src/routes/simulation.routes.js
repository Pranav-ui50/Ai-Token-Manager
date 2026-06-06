/**
 * Simulation Routes
 *
 * Routes for simulation management.
 */

import { Router } from 'express';
import simulationController from '../controllers/simulation.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/simulations/templates
 * @desc    Get simulation templates
 * @access  Private
 */
router.get('/templates',
  simulationController.getTemplates
);

/**
 * @route   GET /api/simulations/statistics/:organizationId
 * @desc    Get simulation statistics
 * @access  Private
 */
router.get('/statistics/:organizationId',
  [
    param('organizationId').isMongoId().withMessage('Invalid organization ID'),
    validate
  ],
  simulationController.getStatistics
);

/**
 * @route   GET /api/simulations/organization/:organizationId
 * @desc    Get simulations for organization
 * @access  Private
 */
router.get('/organization/:organizationId',
  [
    param('organizationId').isMongoId().withMessage('Invalid organization ID'),
    query('status').optional().isIn(['draft', 'running', 'completed', 'failed', 'archived']),
    query('type').optional().isIn(['growth', 'pricing_change', 'custom', 'expense_forecast', 'revenue_forecast']),
    validate
  ],
  simulationController.getForOrganization
);

/**
 * @route   POST /api/simulations/compare
 * @desc    Compare multiple simulations
 * @access  Private
 */
router.post('/compare',
  [
    body('simulationIds')
      .isArray({ min: 2, max: 5 })
      .withMessage('Simulation IDs must be an array of 2-5 items'),
    body('simulationIds.*')
      .isMongoId()
      .withMessage('Each simulation ID must be a valid MongoDB ID'),
    validate
  ],
  simulationController.compare
);

/**
 * @route   POST /api/simulations
 * @desc    Create a new simulation
 * @access  Private
 */
router.post('/',
  [
    body('organizationId')
      .isMongoId()
      .withMessage('Valid organization ID is required'),
    body('name')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('type')
      .isIn(['growth', 'pricing_change', 'custom', 'expense_forecast', 'revenue_forecast'])
      .withMessage('Invalid simulation type'),
    body('parameters.startDate')
      .isISO8601()
      .withMessage('Valid start date is required'),
    body('parameters.endDate')
      .isISO8601()
      .withMessage('Valid end date is required'),
    body('projectId')
      .optional()
      .isMongoId()
      .withMessage('Invalid project ID'),
    validate
  ],
  simulationController.create
);

/**
 * @route   GET /api/simulations/:id
 * @desc    Get simulation by ID
 * @access  Private
 */
router.get('/:id',
  [
    param('id').isMongoId().withMessage('Invalid simulation ID'),
    validate
  ],
  simulationController.getById
);

/**
 * @route   PUT /api/simulations/:id
 * @desc    Update simulation
 * @access  Private
 */
router.put('/:id',
  [
    param('id').isMongoId().withMessage('Invalid simulation ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('type')
      .optional()
      .isIn(['growth', 'pricing_change', 'custom', 'expense_forecast', 'revenue_forecast']),
    validate
  ],
  simulationController.update
);

/**
 * @route   DELETE /api/simulations/:id
 * @desc    Delete simulation
 * @access  Private
 */
router.delete('/:id',
  [
    param('id').isMongoId().withMessage('Invalid simulation ID'),
    validate
  ],
  simulationController.delete
);

/**
 * @route   POST /api/simulations/:id/run
 * @desc    Run simulation
 * @access  Private
 */
router.post('/:id/run',
  [
    param('id').isMongoId().withMessage('Invalid simulation ID'),
    validate
  ],
  simulationController.run
);

/**
 * @route   POST /api/simulations/:id/duplicate
 * @desc    Duplicate simulation
 * @access  Private
 */
router.post('/:id/duplicate',
  [
    param('id').isMongoId().withMessage('Invalid simulation ID'),
    validate
  ],
  simulationController.duplicate
);

/**
 * @route   POST /api/simulations/scenario-comparison
 * @desc    Run scenario comparison
 * @access  Private
 */
router.post('/scenario-comparison',
  [
    body('organizationId')
      .isMongoId()
      .withMessage('Valid organization ID is required'),
    body('scenarios')
      .isArray({ min: 2, max: 10 })
      .withMessage('Scenarios must be an array of 2-10 items'),
    validate
  ],
  simulationController.runScenarioComparison
);

/**
 * @route   POST /api/simulations/sensitivity-analysis
 * @desc    Run sensitivity analysis
 * @access  Private
 */
router.post('/sensitivity-analysis',
  [
    body('organizationId')
      .isMongoId()
      .withMessage('Valid organization ID is required'),
    body('baseParameters')
      .isObject()
      .withMessage('Base parameters are required'),
    body('variables')
      .isArray({ min: 1 })
      .withMessage('Variables must be a non-empty array'),
    validate
  ],
  simulationController.runSensitivityAnalysis
);

/**
 * @route   POST /api/simulations/monte-carlo
 * @desc    Run Monte Carlo simulation
 * @access  Private
 */
router.post('/monte-carlo',
  [
    body('organizationId')
      .isMongoId()
      .withMessage('Valid organization ID is required'),
    body('baseParameters')
      .isObject()
      .withMessage('Base parameters are required'),
    body('uncertainties')
      .isObject()
      .withMessage('Uncertainties are required'),
    body('iterations')
      .optional()
      .isInt({ min: 100, max: 10000 })
      .withMessage('Iterations must be between 100 and 10000'),
    validate
  ],
  simulationController.runMonteCarlo
);

/**
 * @route   POST /api/simulations/revenue-forecast
 * @desc    Generate revenue forecast with scenarios
 * @access  Private
 */
router.post('/revenue-forecast',
  [
    body('organizationId')
      .isMongoId()
      .withMessage('Valid organization ID is required'),
    body('parameters')
      .isObject()
      .withMessage('Parameters are required'),
    validate
  ],
  simulationController.generateRevenueForecast
);

export default router;