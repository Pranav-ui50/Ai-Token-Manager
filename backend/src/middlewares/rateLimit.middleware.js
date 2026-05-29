/**
 * Rate Limit Middleware
 *
 * Express middleware for rate limiting using the rate limiter service.
 */

import rateLimiterService from '../services/rateLimiter.service.js';

/**
 * General API rate limiter
 * Limits: 100 requests per minute
 */
export const generalLimiter = rateLimiterService.middleware('general');

/**
 * Authentication rate limiter
 * Limits: 10 requests per 15 minutes
 */
export const authLimiter = rateLimiterService.middleware('auth');

/**
 * Password reset rate limiter
 * Limits: 3 requests per hour
 */
export const passwordResetLimiter = rateLimiterService.middleware('passwordReset');

/**
 * Registration rate limiter
 * Limits: 5 requests per hour
 */
export const registrationLimiter = rateLimiterService.middleware('registration');

/**
 * Calculation rate limiter
 * Limits: 50 requests per minute
 */
export const calculationLimiter = rateLimiterService.middleware('calculations');

/**
 * Report generation rate limiter
 * Limits: 20 requests per hour
 */
export const reportLimiter = rateLimiterService.middleware('reports');

/**
 * Simulation rate limiter
 * Limits: 30 requests per minute
 */
export const simulationLimiter = rateLimiterService.middleware('simulations');

/**
 * Integration rate limiter
 * Limits: 30 requests per minute
 */
export const integrationLimiter = rateLimiterService.middleware('integrations');

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Custom error message
 * @returns {Function} Express middleware
 */
export const createRateLimiter = (options) => {
  return rateLimiterService.middleware('general', options);
};

/**
 * Authenticated rate limiter (requires user to be logged in)
 * @param {string} type - Rate limit type
 * @param {Object} options - Override options
 * @returns {Function} Express middleware
 */
export const authenticatedLimiter = (type, options = {}) => {
  return rateLimiterService.authenticatedMiddleware(type, options);
};

// ==========================================
// Organization-Level Rate Limiters
// ==========================================

/**
 * Organization-aware rate limiter for general API
 * Applies tier-based limits based on organization subscription
 */
export const orgGeneralLimiter = rateLimiterService.organizationMiddleware('general');

/**
 * Organization-aware rate limiter for calculations
 * Applies tier-based limits for pricing calculations
 */
export const orgCalculationLimiter = rateLimiterService.organizationMiddleware('calculations');

/**
 * Organization-aware rate limiter for reports
 * Applies tier-based limits for report generation
 */
export const orgReportLimiter = rateLimiterService.organizationMiddleware('reports');

/**
 * Organization-aware rate limiter for simulations
 * Applies tier-based limits for cost simulations
 */
export const orgSimulationLimiter = rateLimiterService.organizationMiddleware('simulations');

/**
 * Organization-aware rate limiter for integrations
 * Applies tier-based limits for external integrations
 */
export const orgIntegrationLimiter = rateLimiterService.organizationMiddleware('integrations');

/**
 * Combined user + organization rate limiter
 * Checks both individual and organization-wide limits
 * @param {string} type - Rate limit type
 * @param {Object} options - Override options
 * @returns {Function} Express middleware
 */
export const combinedLimiter = (type, options = {}) => {
  return rateLimiterService.combinedMiddleware(type, options);
};

/**
 * Token usage rate limiter middleware
 * Tracks and limits token usage per organization
 * @param {Object} getOrganization - Function to extract organization from request
 * @returns {Function} Express middleware
 */
export const tokenUsageLimiter = (getOrganization = null) => {
  return async (req, res, next) => {
    if (!req.user?.id) {
      return next();
    }

    const organization = getOrganization
      ? await getOrganization(req)
      : req.user?.organization;

    if (!organization) {
      return next();
    }

    const { id: orgId, tier = 'free' } = organization;

    // Estimate tokens from request body or default to 1
    let estimatedTokens = 1;
    if (req.body?.messages && Array.isArray(req.body.messages)) {
      // Rough estimation for chat completions
      estimatedTokens = req.body.messages.reduce((sum, msg) => {
        return sum + (msg.content?.length || 0) / 4; // ~4 chars per token
      }, Math.ceil((req.body.prompt?.length || 0) / 4));
    } else if (req.body?.prompt) {
      estimatedTokens = Math.ceil(req.body.prompt.length / 4);
    }

    const result = await rateLimiterService.checkOrganizationTokenUsage(
      orgId,
      Math.max(1, Math.floor(estimatedTokens)),
      tier
    );

    // Set token usage headers
    res.set({
      'X-Token-Limit-Minute': result.minuteLimit,
      'X-Token-Used-Minute': result.minuteUsage,
      'X-Token-Limit-Day': result.dayLimit,
      'X-Token-Used-Day': result.dayUsage
    });

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: `Token limit exceeded. ${result.reason === 'MINUTE_LIMIT_EXCEEDED' ? 'Please wait a minute' : 'Daily limit reached'}.`,
          reason: result.reason,
          tier,
          currentUsage: {
            minute: result.minuteUsage,
            day: result.dayUsage
          },
          limits: {
            minute: result.minuteLimit,
            day: result.dayLimit
          },
          retryAfter: result.retryAfter,
          upgradeUrl: '/billing/plans'
        }
      });
    }

    next();
  };
};

/**
 * Organization rate limit middleware factory
 * Creates rate limiter with custom organization extraction
 * @param {string} type - Rate limit type
 * @param {Function} getOrganization - Async function to get organization from request
 * @returns {Function} Express middleware
 */
export const createOrgLimiter = (type, getOrganization) => {
  return rateLimiterService.organizationMiddleware(type, getOrganization);
};

export default {
  // Basic rate limiters
  general: generalLimiter,
  auth: authLimiter,
  passwordReset: passwordResetLimiter,
  registration: registrationLimiter,
  calculation: calculationLimiter,
  report: reportLimiter,
  simulation: simulationLimiter,
  integration: integrationLimiter,
  create: createRateLimiter,
  authenticated: authenticatedLimiter,

  // Organization-level rate limiters
  orgGeneral: orgGeneralLimiter,
  orgCalculation: orgCalculationLimiter,
  orgReport: orgReportLimiter,
  orgSimulation: orgSimulationLimiter,
  orgIntegration: orgIntegrationLimiter,
  combined: combinedLimiter,
  tokenUsage: tokenUsageLimiter,
  createOrg: createOrgLimiter
};