/**
 * Project Validator
 *
 * Validation schemas for project endpoints.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Create project validation
 */
export const create = [
  body('organizationId')
    .notEmpty()
    .withMessage('Organization ID is required')
    .isMongoId()
    .withMessage('Invalid organization ID'),

  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('settings.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),

  body('settings.timezone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Invalid timezone'),

  body('settings.infrastructureCostPerMonth')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Infrastructure cost must be a positive number'),

  validate
];

/**
 * Update project validation
 */
export const update = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('settings.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),

  body('settings.timezone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Invalid timezone'),

  body('settings.defaultModel')
    .optional()
    .isMongoId()
    .withMessage('Invalid model ID'),

  body('settings.infrastructureCostPerMonth')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Infrastructure cost must be a positive number'),

  validate
];

/**
 * Get project validation
 */
export const getById = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),

  validate
];

/**
 * Get projects for organization validation
 */
export const getForOrganization = [
  param('organizationId')
    .isMongoId()
    .withMessage('Invalid organization ID'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', 'archived'])
    .withMessage('Invalid status filter'),

  validate
];

/**
 * Delete project validation
 */
export const deleteProject = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),

  validate
];

/**
 * Archive/restore project validation
 */
export const archive = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),

  validate
];

export const projectValidator = {
  create,
  update,
  getById,
  getForOrganization,
  deleteProject,
  archive
};

export default projectValidator;