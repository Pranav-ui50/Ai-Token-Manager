import { body, query, param } from 'express-validator';
import { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS } from '../models/AuditLog.js';

const getLogsValidation = [
  query('action')
    .optional()
    .isIn(ACTION_TYPES)
    .withMessage(`Invalid action. Must be one of: ${ACTION_TYPES.join(', ')}`),

  query('resourceType')
    .optional()
    .isIn(RESOURCE_TYPES)
    .withMessage(`Invalid resource type. Must be one of: ${RESOURCE_TYPES.join(', ')}`),

  query('resourceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid resource ID'),

  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),

  query('severity')
    .optional()
    .isIn(SEVERITY_LEVELS)
    .withMessage(`Invalid severity. Must be one of: ${SEVERITY_LEVELS.join(', ')}`),

  query('status')
    .optional()
    .isIn(['success', 'failure', 'pending'])
    .withMessage('Invalid status. Must be one of: success, failure, pending'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format. Use ISO 8601 format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format. Use ISO 8601 format')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query cannot exceed 200 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z]+$/)
    .withMessage('Invalid sort parameter')
];

const createLogValidation = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(ACTION_TYPES)
    .withMessage(`Invalid action. Must be one of: ${ACTION_TYPES.join(', ')}`),

  body('resourceType')
    .notEmpty()
    .withMessage('Resource type is required')
    .isIn(RESOURCE_TYPES)
    .withMessage(`Invalid resource type. Must be one of: ${RESOURCE_TYPES.join(', ')}`),

  body('resourceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid resource ID'),

  body('resourceName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Resource name cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('severity')
    .optional()
    .isIn(SEVERITY_LEVELS)
    .withMessage(`Invalid severity. Must be one of: ${SEVERITY_LEVELS.join(', ')}`),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters')
];

const getResourceLogsValidation = [
  param('type')
    .isIn(RESOURCE_TYPES)
    .withMessage(`Invalid resource type. Must be one of: ${RESOURCE_TYPES.join(', ')}`),

  param('id')
    .isMongoId()
    .withMessage('Invalid resource ID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z]+$/)
    .withMessage('Invalid sort parameter')
];

const getUserLogsValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z]+$/)
    .withMessage('Invalid sort parameter')
];

const getStatisticsValidation = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const exportLogsValidation = [
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Invalid format. Must be json or csv'),

  query('action')
    .optional()
    .isIn(ACTION_TYPES)
    .withMessage(`Invalid action. Must be one of: ${ACTION_TYPES.join(', ')}`),

  query('resourceType')
    .optional()
    .isIn(RESOURCE_TYPES)
    .withMessage(`Invalid resource type. Must be one of: ${RESOURCE_TYPES.join(', ')}`),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

const cleanupLogsValidation = [
  body('daysOld')
    .optional()
    .isInt({ min: 30, max: 3650 })
    .withMessage('daysOld must be between 30 and 3650')
];

export default {
  getLogs: getLogsValidation,
  createLog: createLogValidation,
  getResourceLogs: getResourceLogsValidation,
  getUserLogs: getUserLogsValidation,
  getStatistics: getStatisticsValidation,
  exportLogs: exportLogsValidation,
  cleanupLogs: cleanupLogsValidation
};