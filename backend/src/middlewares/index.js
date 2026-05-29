/**
 * Middlewares Index
 *
 * Export all middleware modules.
 */

import { authMiddleware, requireAuth, requireRole, requirePermission, optionalAuth } from './auth.middleware.js';
import { validate, validateBody, validateParams, validateQuery } from './validation.middleware.js';
import { errorHandler, notFound, AppError } from './error.middleware.js';
import rateLimitMiddleware from './rateLimit.middleware.js';

export {
  // Auth middlewares
  authMiddleware,
  requireAuth,
  requireRole,
  requirePermission,
  optionalAuth,

  // Validation middlewares
  validate,
  validateBody,
  validateParams,
  validateQuery,

  // Error handling
  errorHandler,
  notFound,
  AppError,

  // Rate limiting
  rateLimitMiddleware
};

export default {
  auth: authMiddleware,
  requireAuth,
  requireRole,
  requirePermission,
  optionalAuth,
  validate,
  validateBody,
  validateParams,
  validateQuery,
  errorHandler,
  notFound,
  AppError,
  rateLimit: rateLimitMiddleware
};