import { body, query, param } from 'express-validator';
import { REPORT_TYPES, FILE_FORMATS } from '../models/Report.js';

const createReportValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Report name is required')
    .isLength({ max: 200 })
    .withMessage('Report name cannot exceed 200 characters'),

  body('type')
    .notEmpty()
    .withMessage('Report type is required')
    .isIn(REPORT_TYPES)
    .withMessage(`Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('parameters.dateRange.start')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('parameters.dateRange.end')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      const start = new Date(req.body.parameters.dateRange.start);
      const end = new Date(value);
      if (end <= start) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('parameters.features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),

  body('parameters.features.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid feature ID'),

  body('parameters.plans')
    .optional()
    .isArray()
    .withMessage('Plans must be an array'),

  body('parameters.plans.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid plan ID'),

  body('parameters.providers')
    .optional()
    .isArray()
    .withMessage('Providers must be an array'),

  body('parameters.providers.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid provider ID'),

  body('parameters.models')
    .optional()
    .isArray()
    .withMessage('Models must be an array'),

  body('parameters.models.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid model ID'),

  body('parameters.groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Invalid groupBy value. Must be one of: day, week, month, quarter, year'),

  body('parameters.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),

  body('parameters.filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  body('schedule.isScheduled')
    .optional()
    .isBoolean()
    .withMessage('isScheduled must be a boolean'),

  body('schedule.frequency')
    .optional()
    .isIn(['once', 'daily', 'weekly', 'monthly', 'quarterly'])
    .withMessage('Invalid frequency. Must be one of: once, daily, weekly, monthly, quarterly'),

  body('schedule.recipients')
    .optional()
    .isArray()
    .withMessage('Recipients must be an array'),

  body('schedule.recipients.*')
    .optional()
    .isEmail()
    .withMessage('Invalid email address in recipients')
];

const updateReportValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid report ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Report name cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),

  body('parameters.dateRange.start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('parameters.dateRange.end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  body('schedule.isScheduled')
    .optional()
    .isBoolean()
    .withMessage('isScheduled must be a boolean'),

  body('schedule.frequency')
    .optional()
    .isIn(['once', 'daily', 'weekly', 'monthly', 'quarterly'])
    .withMessage('Invalid frequency')
];

const listReportsValidation = [
  query('type')
    .optional()
    .isIn(REPORT_TYPES)
    .withMessage(`Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`),

  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status. Must be one of: pending, processing, completed, failed'),

  query('isTemplate')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isTemplate must be true or false'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z]+$/)
    .withMessage('Invalid sort parameter')
];

const createTemplateValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ max: 200 })
    .withMessage('Template name cannot exceed 200 characters'),

  body('type')
    .notEmpty()
    .withMessage('Report type is required')
    .isIn(REPORT_TYPES)
    .withMessage(`Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('parameters')
    .notEmpty()
    .withMessage('Parameters are required for templates'),

  body('parameters.groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Invalid groupBy value'),

  body('parameters.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const createFromTemplateValidation = [
  param('templateId')
    .isMongoId()
    .withMessage('Invalid template ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Report name cannot exceed 200 characters'),

  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object')
];

const shareReportValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid report ID'),

  body('userIds')
    .isArray({ min: 1 })
    .withMessage('userIds must be a non-empty array'),

  body('userIds.*')
    .isMongoId()
    .withMessage('Invalid user ID in userIds'),

  body('permission')
    .optional()
    .isIn(['view', 'edit'])
    .withMessage('Permission must be either view or edit')
];

export default {
  createReport: createReportValidation,
  updateReport: updateReportValidation,
  listReports: listReportsValidation,
  createTemplate: createTemplateValidation,
  createFromTemplate: createFromTemplateValidation,
  shareReport: shareReportValidation
};