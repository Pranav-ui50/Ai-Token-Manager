/**
 * Rate Limiter Service
 *
 * Redis-based rate limiting with in-memory fallback.
 * Provides configurable rate limiting for API endpoints.
 */

import { getRedisClient, isRedisConnected } from '../config/redis.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

// In-memory rate limit store
const memoryStore = new Map();

// Rate limit configurations - use config values or defaults
const isDev = config.nodeEnv === 'development';

const RATE_LIMITS = {
  // General API rate limit
  general: {
    windowMs: config.rateLimit.windowMs || 60000,
    max: isDev ? 10000 : (config.rateLimit.max || 100),
    message: 'Too many requests, please try again later.'
  },
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : (config.rateLimit.authMax || 10),
    message: 'Too many login attempts, please try again later.'
  },
  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 100 : 3,
    message: 'Too many password reset attempts, please try again later.'
  },
  // Registration
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 100 : 5,
    message: 'Too many registration attempts, please try again later.'
  },
  // Pricing calculations
  calculations: {
    windowMs: 60 * 1000, // 1 minute
    max: isDev ? 1000 : 50,
    message: 'Too many calculation requests, please slow down.'
  },
  // Report generation
  reports: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 100 : 20,
    message: 'Too many report generation requests, please try again later.'
  },
  // Simulations
  simulations: {
    windowMs: 60 * 1000, // 1 minute
    max: isDev ? 500 : 30,
    message: 'Too many simulation requests, please slow down.'
  },
  // API integrations
  integrations: {
    windowMs: 60 * 1000, // 1 minute
    max: isDev ? 500 : 30,
    message: 'Too many integration requests, please slow down.'
  }
};

// Organization tier-based rate limits
const ORG_RATE_LIMITS = {
  // Free tier limits
  free: {
    general: { windowMs: 60000, max: 60 },
    calculations: { windowMs: 60000, max: 20 },
    reports: { windowMs: 3600000, max: 5 },
    simulations: { windowMs: 60000, max: 10 },
    integrations: { windowMs: 60000, max: 10 },
    tokensPerMinute: 1000,
    tokensPerDay: 10000
  },
  // Starter tier limits
  starter: {
    general: { windowMs: 60000, max: 120 },
    calculations: { windowMs: 60000, max: 50 },
    reports: { windowMs: 3600000, max: 15 },
    simulations: { windowMs: 60000, max: 25 },
    integrations: { windowMs: 60000, max: 20 },
    tokensPerMinute: 5000,
    tokensPerDay: 50000
  },
  // Professional tier limits
  professional: {
    general: { windowMs: 60000, max: 300 },
    calculations: { windowMs: 60000, max: 150 },
    reports: { windowMs: 3600000, max: 50 },
    simulations: { windowMs: 60000, max: 100 },
    integrations: { windowMs: 60000, max: 60 },
    tokensPerMinute: 20000,
    tokensPerDay: 500000
  },
  // Enterprise tier limits (very high limits)
  enterprise: {
    general: { windowMs: 60000, max: 1000 },
    calculations: { windowMs: 60000, max: 500 },
    reports: { windowMs: 3600000, max: 200 },
    simulations: { windowMs: 60000, max: 300 },
    integrations: { windowMs: 60000, max: 200 },
    tokensPerMinute: 100000,
    tokensPerDay: 5000000
  }
};

/**
 * Rate Limiter Service Class
 */
class RateLimiterService {
  constructor() {
    this.prefix = 'ratelimit:';
    this.cleanupInterval = setInterval(() => this.cleanupMemoryStore(), 60000);
  }

  /**
   * Generate rate limit key
   * @param {string} type - Rate limit type
   * @param {string} identifier - Client identifier (IP or user ID)
   * @returns {string}
   */
  getKey(type, identifier) {
    return `${this.prefix}${type}:${identifier}`;
  }

  /**
   * Check and increment rate limit
   * @param {string} type - Rate limit type
   * @param {string} identifier - Client identifier
   * @param {Object} options - Override options
   * @returns {Promise<Object>}
   */
  async checkLimit(type, identifier, options = {}) {
    const config = { ...RATE_LIMITS[type] || RATE_LIMITS.general, ...options };
    const key = this.getKey(type, identifier);
    const windowMs = config.windowMs;
    const max = config.max;

    // Try Redis first
    if (isRedisConnected()) {
      return this.checkRedisLimit(key, windowMs, max, config.message);
    }

    // Fallback to memory
    return this.checkMemoryLimit(key, windowMs, max, config.message);
  }

  /**
   * Check rate limit using Redis
   * @param {string} key - Cache key
   * @param {number} windowMs - Window in milliseconds
   * @param {number} max - Maximum requests
   * @param {string} message - Error message
   * @returns {Promise<Object>}
   */
  async checkRedisLimit(key, windowMs, max, message) {
    try {
      const client = getRedisClient();
      const windowSeconds = Math.floor(windowMs / 1000);

      // Get current count
      const current = await client.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await client.expire(key, windowSeconds);
      }

      // Get TTL for reset time
      const ttl = await client.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);

      return {
        allowed: current <= max,
        current,
        max,
        remaining: Math.max(0, max - current),
        resetTime,
        retryAfter: current > max ? ttl : 0,
        message: current > max ? message : null
      };
    } catch (error) {
      logger.warn('Redis rate limit error:', error.message);
      // Fallback to memory on Redis error
      return this.checkMemoryLimit(key, windowMs, max, message);
    }
  }

  /**
   * Check rate limit using memory store
   * @param {string} key - Cache key
   * @param {number} windowMs - Window in milliseconds
   * @param {number} max - Maximum requests
   * @param {string} message - Error message
   * @returns {Object}
   */
  checkMemoryLimit(key, windowMs, max, message) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create entry
    let entry = memoryStore.get(key);
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        windowStart: now,
        count: 0,
        resetTime: now + windowMs
      };
    }

    // Increment count
    entry.count++;
    memoryStore.set(key, entry);

    return {
      allowed: entry.count <= max,
      current: entry.count,
      max,
      remaining: Math.max(0, max - entry.count),
      resetTime: entry.resetTime,
      retryAfter: entry.count > max ? Math.ceil((entry.resetTime - now) / 1000) : 0,
      message: entry.count > max ? message : null
    };
  }

  /**
   * Reset rate limit for identifier
   * @param {string} type - Rate limit type
   * @param {string} identifier - Client identifier
   * @returns {Promise<boolean>}
   */
  async resetLimit(type, identifier) {
    const key = this.getKey(type, identifier);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.del(key);
        return true;
      } catch (error) {
        logger.warn('Redis reset limit error:', error.message);
      }
    }

    memoryStore.delete(key);
    return true;
  }

  /**
   * Get current rate limit status without incrementing
   * @param {string} type - Rate limit type
   * @param {string} identifier - Client identifier
   * @param {Object} options - Override options
   * @returns {Promise<Object>}
   */
  async getStatus(type, identifier, options = {}) {
    const config = { ...RATE_LIMITS[type] || RATE_LIMITS.general, ...options };
    const key = this.getKey(type, identifier);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const current = parseInt(await client.get(key) || '0', 10);
        const ttl = await client.ttl(key);
        const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : 0;

        return {
          current,
          max: config.max,
          remaining: Math.max(0, config.max - current),
          resetTime
        };
      } catch (error) {
        logger.warn('Redis get status error:', error.message);
      }
    }

    const entry = memoryStore.get(key);
    if (!entry) {
      return {
        current: 0,
        max: config.max,
        remaining: config.max,
        resetTime: 0
      };
    }

    return {
      current: entry.count,
      max: config.max,
      remaining: Math.max(0, config.max - entry.count),
      resetTime: entry.resetTime
    };
  }

  /**
   * Create Express middleware for rate limiting
   * @param {string} type - Rate limit type
   * @param {Object} options - Override options
   * @returns {Function}
   */
  middleware(type, options = {}) {
    return async (req, res, next) => {
      // Get identifier (prefer user ID, fallback to IP)
      const identifier = req.user?.id || req.ip;

      // Check rate limit
      const result = await this.checkLimit(type, identifier, options);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.max,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: result.message,
            retryAfter: result.retryAfter
          }
        });
      }

      next();
    };
  }

  /**
   * Create stricter rate limiter for authenticated routes
   * @param {string} type - Rate limit type
   * @param {Object} options - Override options
   * @returns {Function}
   */
  authenticatedMiddleware(type, options = {}) {
    return async (req, res, next) => {
      // Require authentication
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      // Use user ID + organization for more granular limiting
      const orgId = req.headers['x-organization-id'] || req.user.organization || 'default';
      const identifier = `${req.user.id}:${orgId}`;

      return this.middleware(type, options)(req, res, next);
    };
  }

  /**
   * Clean up expired entries in memory store
   */
  cleanupMemoryStore() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetTime < now) {
        memoryStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get all rate limit configurations
   * @returns {Object}
   */
  getConfigurations() {
    return { ...RATE_LIMITS };
  }

  /**
   * Get memory store statistics
   * @returns {Object}
   */
  getStats() {
    return {
      memoryStoreSize: memoryStore.size,
      redisConnected: isRedisConnected()
    };
  }

  // ==========================================
  // Organization-Level Rate Limiting
  // ==========================================

  /**
   * Get rate limit tier for organization
   * @param {string} tier - Subscription tier
   * @returns {Object}
   */
  getTierLimits(tier = 'free') {
    return ORG_RATE_LIMITS[tier] || ORG_RATE_LIMITS.free;
  }

  /**
   * Check organization-level rate limit
   * @param {string} organizationId - Organization ID
   * @param {string} type - Rate limit type
   * @param {string} tier - Subscription tier
   * @returns {Promise<Object>}
   */
  async checkOrganizationLimit(organizationId, type, tier = 'free') {
    const tierLimits = this.getTierLimits(tier);
    const limits = tierLimits[type] || tierLimits.general;
    const key = `${this.prefix}org:${organizationId}:${type}`;

    return this.checkRedisLimit(key, limits.windowMs, limits.max, `Organization rate limit exceeded for ${type}`);
  }

  /**
   * Check organization token usage
   * @param {string} organizationId - Organization ID
   * @param {number} tokens - Tokens to add
   * @param {string} tier - Subscription tier
   * @returns {Promise<Object>}
   */
  async checkOrganizationTokenUsage(organizationId, tokens, tier = 'free') {
    const tierLimits = this.getTierLimits(tier);
    const minuteKey = `${this.prefix}org:${organizationId}:tokens:minute`;
    const dayKey = `${this.prefix}org:${organizationId}:tokens:day`;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();

        // Check minute limit
        const minuteUsage = parseInt(await client.get(minuteKey) || '0', 10);
        const dayUsage = parseInt(await client.get(dayKey) || '0', 10);

        const minuteExceeded = minuteUsage + tokens > tierLimits.tokensPerMinute;
        const dayExceeded = dayUsage + tokens > tierLimits.tokensPerDay;

        if (minuteExceeded || dayExceeded) {
          return {
            allowed: false,
            reason: minuteExceeded ? 'MINUTE_LIMIT_EXCEEDED' : 'DAY_LIMIT_EXCEEDED',
            minuteUsage,
            minuteLimit: tierLimits.tokensPerMinute,
            dayUsage,
            dayLimit: tierLimits.tokensPerDay,
            retryAfter: minuteExceeded ? 60 : 86400 // seconds
          };
        }

        // Increment usage
        const newMinuteUsage = await client.incrby(minuteKey, tokens);
        const newDayUsage = await client.incrby(dayKey, tokens);

        // Set expiry on first use
        if (newMinuteUsage === tokens) {
          await client.expire(minuteKey, 60);
        }
        if (newDayUsage === tokens) {
          await client.expire(dayKey, 86400);
        }

        return {
          allowed: true,
          minuteUsage: newMinuteUsage,
          minuteLimit: tierLimits.tokensPerMinute,
          dayUsage: newDayUsage,
          dayLimit: tierLimits.tokensPerDay
        };
      } catch (error) {
        logger.warn('Redis token usage check error:', error.message);
        // Allow on Redis failure (fail open)
        return { allowed: true };
      }
    }

    // Memory fallback for token usage (simplified)
    return this.checkMemoryTokenUsage(organizationId, tokens, tierLimits);
  }

  /**
   * Check token usage using memory store
   * @param {string} organizationId - Organization ID
   * @param {number} tokens - Tokens to add
   * @param {Object} tierLimits - Tier limits
   * @returns {Object}
   */
  checkMemoryTokenUsage(organizationId, tokens, tierLimits) {
    const now = Date.now();
    const minuteKey = `${this.prefix}org:${organizationId}:tokens:minute`;
    const dayKey = `${this.prefix}org:${organizationId}:tokens:day`;

    // Minute window
    let minuteEntry = memoryStore.get(minuteKey);
    if (!minuteEntry || minuteEntry.windowStart < now - 60000) {
      minuteEntry = { windowStart: now, count: 0, resetTime: now + 60000 };
    }
    minuteEntry.count += tokens;
    memoryStore.set(minuteKey, minuteEntry);

    // Day window
    let dayEntry = memoryStore.get(dayKey);
    if (!dayEntry || dayEntry.windowStart < now - 86400000) {
      dayEntry = { windowStart: now, count: 0, resetTime: now + 86400000 };
    }
    dayEntry.count += tokens;
    memoryStore.set(dayKey, dayEntry);

    const minuteExceeded = minuteEntry.count > tierLimits.tokensPerMinute;
    const dayExceeded = dayEntry.count > tierLimits.tokensPerDay;

    if (minuteExceeded || dayExceeded) {
      return {
        allowed: false,
        reason: minuteExceeded ? 'MINUTE_LIMIT_EXCEEDED' : 'DAY_LIMIT_EXCEEDED',
        minuteUsage: minuteEntry.count,
        minuteLimit: tierLimits.tokensPerMinute,
        dayUsage: dayEntry.count,
        dayLimit: tierLimits.tokensPerDay,
        retryAfter: minuteExceeded ? 60 : 86400
      };
    }

    return {
      allowed: true,
      minuteUsage: minuteEntry.count,
      minuteLimit: tierLimits.tokensPerMinute,
      dayUsage: dayEntry.count,
      dayLimit: tierLimits.tokensPerDay
    };
  }

  /**
   * Get organization token usage statistics
   * @param {string} organizationId - Organization ID
   * @param {string} tier - Subscription tier
   * @returns {Promise<Object>}
   */
  async getOrganizationTokenStats(organizationId, tier = 'free') {
    const tierLimits = this.getTierLimits(tier);
    const minuteKey = `${this.prefix}org:${organizationId}:tokens:minute`;
    const dayKey = `${this.prefix}org:${organizationId}:tokens:day`;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const minuteUsage = parseInt(await client.get(minuteKey) || '0', 10);
        const dayUsage = parseInt(await client.get(dayKey) || '0', 10);

        return {
          minute: {
            used: minuteUsage,
            limit: tierLimits.tokensPerMinute,
            remaining: Math.max(0, tierLimits.tokensPerMinute - minuteUsage),
            resetIn: await client.ttl(minuteKey)
          },
          day: {
            used: dayUsage,
            limit: tierLimits.tokensPerDay,
            remaining: Math.max(0, tierLimits.tokensPerDay - dayUsage),
            resetIn: await client.ttl(dayKey)
          }
        };
      } catch (error) {
        logger.warn('Redis token stats error:', error.message);
      }
    }

    // Memory fallback
    const now = Date.now();
    const minuteEntry = memoryStore.get(`${this.prefix}org:${organizationId}:tokens:minute`);
    const dayEntry = memoryStore.get(`${this.prefix}org:${organizationId}:tokens:day`);

    return {
      minute: {
        used: minuteEntry?.count || 0,
        limit: tierLimits.tokensPerMinute,
        remaining: tierLimits.tokensPerMinute - (minuteEntry?.count || 0),
        resetIn: minuteEntry ? Math.max(0, Math.floor((minuteEntry.resetTime - now) / 1000)) : 0
      },
      day: {
        used: dayEntry?.count || 0,
        limit: tierLimits.tokensPerDay,
        remaining: tierLimits.tokensPerDay - (dayEntry?.count || 0),
        resetIn: dayEntry ? Math.max(0, Math.floor((dayEntry.resetTime - now) / 1000)) : 0
      }
    };
  }

  /**
   * Create organization-aware rate limiter middleware
   * @param {string} type - Rate limit type
   * @param {Object} getOrganization - Function to get organization from request
   * @returns {Function}
   */
  organizationMiddleware(type, getOrganization = null) {
    return async (req, res, next) => {
      // Skip rate limiting for enterprise tier
      const organization = getOrganization
        ? await getOrganization(req)
        : req.user?.organization;

      if (!organization) {
        return this.middleware(type)(req, res, next);
      }

      const { id: orgId, tier = 'free' } = organization;

      // Enterprise tier gets bypass for most rate limits
      if (tier === 'enterprise') {
        return next();
      }

      const result = await this.checkOrganizationLimit(orgId, type, tier);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.max,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        'X-RateLimit-Tier': tier
      });

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          success: false,
          error: {
            code: 'ORGANIZATION_RATE_LIMIT_EXCEEDED',
            message: result.message,
            retryAfter: result.retryAfter,
            tier,
            upgradeUrl: '/billing/plans'
          }
        });
      }

      next();
    };
  }

  /**
   * Combined user + organization rate limiter
   * Checks both individual user limit and organization-wide limit
   * @param {string} type - Rate limit type
   * @param {Object} options - Configuration options
   * @returns {Function}
   */
  combinedMiddleware(type, options = {}) {
    return async (req, res, next) => {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      const userId = req.user.id;
      const organization = req.user.organization;
      const orgId = organization?.id || 'default';
      const tier = organization?.tier || 'free';

      // Check user-level limit
      const userKey = `${this.prefix}user:${userId}:${type}`;
      const userConfig = { ...RATE_LIMITS[type] || RATE_LIMITS.general, ...options };
      const userResult = await this.checkRedisLimit(
        userKey,
        userConfig.windowMs,
        userConfig.max,
        userConfig.message
      );

      // Check organization-level limit (skip for enterprise)
      let orgResult = { allowed: true };
      if (tier !== 'enterprise') {
        orgResult = await this.checkOrganizationLimit(orgId, type, tier);
      }

      // Set combined rate limit headers
      res.set({
        'X-RateLimit-Limit': userResult.max,
        'X-RateLimit-Remaining': Math.min(userResult.remaining, orgResult.remaining || userResult.remaining),
        'X-RateLimit-Reset': new Date(Math.max(userResult.resetTime, orgResult.resetTime || 0)).toISOString(),
        'X-RateLimit-Tier': tier,
        'X-Organization-Limit': orgResult.max,
        'X-Organization-Remaining': orgResult.remaining || 0
      });

      // Block if either limit is exceeded
      if (!userResult.allowed) {
        res.set('Retry-After', userResult.retryAfter);
        return res.status(429).json({
          success: false,
          error: {
            code: 'USER_RATE_LIMIT_EXCEEDED',
            message: userResult.message,
            retryAfter: userResult.retryAfter
          }
        });
      }

      if (!orgResult.allowed) {
        res.set('Retry-After', orgResult.retryAfter);
        return res.status(429).json({
          success: false,
          error: {
            code: 'ORGANIZATION_RATE_LIMIT_EXCEEDED',
            message: orgResult.message,
            retryAfter: orgResult.retryAfter,
            tier,
            upgradeUrl: '/billing/plans'
          }
        });
      }

      next();
    };
  }

  /**
   * Reset organization rate limits
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async resetOrganizationLimits(organizationId) {
    const pattern = `${this.prefix}org:${organizationId}:*`;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(keys);
        }
      } catch (error) {
        logger.warn('Redis reset organization limits error:', error.message);
      }
    }

    // Clear from memory
    for (const key of memoryStore.keys()) {
      if (key.includes(`org:${organizationId}:`)) {
        memoryStore.delete(key);
      }
    }

    return true;
  }
}

// Export singleton instance
const rateLimiterService = new RateLimiterService();
export default rateLimiterService;
export { RATE_LIMITS, ORG_RATE_LIMITS };