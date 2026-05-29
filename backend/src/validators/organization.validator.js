/**
 * Organization Validator
 *
 * Validation schemas for organization endpoints.
 */

import { body, param, query } from 'express-validator';
import { validate } from '../middlewares/validation.middleware.js';

/**
 * Validate organization creation
 */
export const validateCreate = validate([
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ max: 100 })
    .withMessage('Organization name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
]);

/**
 * Validate organization update
 */
export const validateUpdate = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organization name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL')
]);

/**
 * Validate organization ID param
 */
export const validateOrgId = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID')
]);

/**
 * Validate invite member
 */
export const validateInvite = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('roleId')
    .notEmpty()
    .withMessage('Role is required')
    .isMongoId()
    .withMessage('Invalid role ID'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
]);

/**
 * Validate accept invitation
 */
export const validateAcceptInvite = validate([
  param('token')
    .notEmpty()
    .withMessage('Invitation token is required'),
  query('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
]);

/**
 * Validate member operations
 */
export const validateMemberOperation = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID')
]);

/**
 * Validate transfer ownership
 */
export const validateTransferOwnership = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('newOwnerId')
    .notEmpty()
    .withMessage('New owner ID is required')
    .isMongoId()
    .withMessage('Invalid user ID')
]);

/**
 * Validate update member role
 */
export const validateUpdateRole = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID'),
  body('roleId')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Invalid role ID')
]);

/**
 * Validate add member directly
 */
export const validateAddMember = validate([
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('roleId')
    .notEmpty()
    .withMessage('Role is required')
    .isMongoId()
    .withMessage('Invalid role ID')
]);