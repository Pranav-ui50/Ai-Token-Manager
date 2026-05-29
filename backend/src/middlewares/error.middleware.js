/**
 * Error Handling Middleware
 *
 * Centralized error handling for the application.
 */

import logger from '../config/logger.js';

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
export const notFound = (req, res, next) => {
  const error = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

/**
 * Global Error Handler
 * Handles all errors in the application
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Log error
  if (err.statusCode >= 500) {
    logger.error(`Error ${err.statusCode}: ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });
  } else {
    logger.warn(`Error ${err.statusCode}: ${err.message}`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ERROR',
        message: `${field} '${value}' already exists`,
        details: [{ field, message: 'This value must be unique' }]
      }
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ${err.path}: ${err.value}`
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token. Please log in again.'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired. Please log in again.'
      }
    });
  }

  // Send response
  const response = {
    success: false,
    error: {
      code: err.errorCode,
      message: err.message
    }
  };

  // Add error details if available
  if (err.details) {
    response.error.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

export default errorHandler;