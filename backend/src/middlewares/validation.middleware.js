/**
 * Validation Middleware
 *
 * Handles express-validator validation results.
 */

import { validationResult } from 'express-validator';

/**
 * Validate request middleware
 * Can be used in two ways:
 * 1. As a factory: validate([validation1, validation2]) - returns middleware
 * 2. As direct middleware: validate - checks validation results
 */
const validate = function (validations) {
  // Check if called as middleware directly (validations = req object)
  // or as a factory function (validations = array of validation chains)
  if (validations && !Array.isArray(validations) && validations.method !== undefined) {
    // Called directly as middleware: validate(req, res, next)
    // This happens when used like: [body(...), validate]
    const req = arguments[0];
    const res = arguments[1];
    const next = arguments[2];

    return checkValidationResult(req, res, next);
  }

  // Called as factory: validate(validations)
  // Return middleware that optionally runs validations then checks results
  return async (req, res, next) => {
    console.log('[Validate] Called with validations:', validations ? validations.length : 'no validations');

    // If validations is an array, run them
    if (validations && Array.isArray(validations)) {
      await Promise.all(validations.map(validation => validation.run(req)));
    }

    return checkValidationResult(req, res, next);
  };
};

/**
 * Check validation results and respond accordingly
 */
function checkValidationResult(req, res, next) {
  // Check for errors
  const errors = validationResult(req);
  console.log('[Validate] Errors:', errors.isEmpty() ? 'none' : errors.array());

  if (errors.isEmpty()) {
    console.log('[Validate] No errors, calling next()');
    return next();
  }

  // Format errors
  const formattedErrors = errors.array().map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));

  console.log('[Validate] Validation failed, returning 400');
  // Send validation error response
  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: formattedErrors
    }
  });
}

export { validate };
export default validate;