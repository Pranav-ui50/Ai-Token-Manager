/**
 * Cache Service
 *
 * Redis-based caching with in-memory fallback.
 * Provides caching for frequently accessed data.
 */

import { getRedisClient, isRedisConnected } from '../config/redis.js';
import logger from '../config/logger.js';

// In-memory cache fallback
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  providerList: 3600,        // 1 hour
  modelPricing: 3600,        // 1 hour
  userPermissions: 900,      // 15 minutes
  organizationSettings: 1800, // 30 minutes
  calculations: 300,         // 5 minutes
  dashboardMetrics: 300,     // 5 minutes
  featureList: 600,          // 10 minutes
  planList: 600,             // 10 minutes
  analytics: 300             // 5 minutes
};

/**
 * Cache Service Class
 */
class CacheService {
  constructor() {
    this.prefix = 'api-token-manager:';
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Generate cache key with prefix
   * @param {string} key - Cache key
   * @returns {string}
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    const fullKey = this.getKey(key);

    // Try Redis first
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const value = await client.get(fullKey);
        if (value !== null) {
          this.stats.hits++;
          logger.debug(`Cache HIT (Redis): ${key}`);
          return JSON.parse(value);
        }
      } catch (error) {
        logger.warn(`Redis get error for key ${key}:`, error.message);
      }
    }

    // Fallback to memory cache
    const memoryValue = memoryCache.get(fullKey);
    if (memoryValue !== undefined) {
      const expiry = memoryCacheExpiry.get(fullKey);
      if (expiry && expiry > Date.now()) {
        this.stats.hits++;
        logger.debug(`Cache HIT (Memory): ${key}`);
        return memoryValue;
      } else {
        // Expired, clean up
        memoryCache.delete(fullKey);
        memoryCacheExpiry.delete(fullKey);
      }
    }

    this.stats.misses++;
    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 300) {
    const fullKey = this.getKey(key);
    const stringValue = JSON.stringify(value);

    // Try Redis first
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.setEx(fullKey, ttl, stringValue);
        this.stats.sets++;
        logger.debug(`Cache SET (Redis): ${key}, TTL: ${ttl}s`);
        return true;
      } catch (error) {
        logger.warn(`Redis set error for key ${key}:`, error.message);
      }
    }

    // Fallback to memory cache
    memoryCache.set(fullKey, value);
    memoryCacheExpiry.set(fullKey, Date.now() + (ttl * 1000));
    this.stats.sets++;
    logger.debug(`Cache SET (Memory): ${key}, TTL: ${ttl}s`);
    return true;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    const fullKey = this.getKey(key);
    let deleted = false;

    // Delete from Redis
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.del(fullKey);
        deleted = true;
      } catch (error) {
        logger.warn(`Redis del error for key ${key}:`, error.message);
      }
    }

    // Delete from memory cache
    if (memoryCache.has(fullKey)) {
      memoryCache.delete(fullKey);
      memoryCacheExpiry.delete(fullKey);
      deleted = true;
    }

    if (deleted) {
      this.stats.deletes++;
      logger.debug(`Cache DEL: ${key}`);
    }

    return deleted;
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   * @returns {Promise<number>}
   */
  async delPattern(pattern) {
    const fullPattern = this.getKey(pattern);
    let count = 0;

    // Delete from Redis
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const keys = await client.keys(fullPattern);
        if (keys.length > 0) {
          await client.del(keys);
          count += keys.length;
        }
      } catch (error) {
        logger.warn(`Redis delPattern error for pattern ${pattern}:`, error.message);
      }
    }

    // Delete from memory cache
    for (const key of memoryCache.keys()) {
      if (this.matchPattern(key, fullPattern)) {
        memoryCache.delete(key);
        memoryCacheExpiry.delete(key);
        count++;
      }
    }

    this.stats.deletes += count;
    logger.debug(`Cache DEL Pattern: ${pattern}, Count: ${count}`);
    return count;
  }

  /**
   * Simple pattern matching for memory cache
   * @param {string} key - Key to match
   * @param {string} pattern - Pattern with wildcards
   * @returns {boolean}
   */
  matchPattern(key, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }

  /**
   * Get or set cache value
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Cache middleware for Express routes
   * @param {string} keyPrefix - Key prefix
   * @param {number} ttl - Time to live in seconds
   * @returns {Function}
   */
  middleware(keyPrefix, ttl = 300) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Build cache key from request
      const userId = req.user?.id || 'anonymous';
      const orgId = req.headers['x-organization-id'] || req.user?.organization;
      const queryString = JSON.stringify(req.query);
      const key = `${keyPrefix}:${userId}:${orgId}:${queryString}`;

      try {
        const cached = await this.get(key);
        if (cached !== null) {
          return res.json({
            success: true,
            data: cached,
            cached: true
          });
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = (data) => {
          if (res.statusCode === 200 && data.success && data.data) {
            this.set(key, data.data, ttl).catch(err => {
              logger.warn('Failed to cache response:', err.message);
            });
          }
          return originalJson(data);
        };

        next();
      } catch (error) {
        logger.warn('Cache middleware error:', error.message);
        next();
      }
    };
  }

  /**
   * Invalidate cache for user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  async invalidateUser(userId) {
    return this.delPattern(`*:${userId}:*`);
  }

  /**
   * Invalidate cache for organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<number>}
   */
  async invalidateOrganization(orgId) {
    return this.delPattern(`*:*:${orgId}:*`);
  }

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async clear() {
    // Clear Redis
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const keys = await client.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await client.del(keys);
        }
      } catch (error) {
        logger.warn('Redis clear error:', error.message);
      }
    }

    // Clear memory cache
    memoryCache.clear();
    memoryCacheExpiry.clear();

    logger.info('All cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: memoryCache.size,
      redisConnected: isRedisConnected()
    };
  }

  /**
   * Get default TTL values
   * @returns {Object}
   */
  getDefaultTTL() {
    return { ...DEFAULT_TTL };
  }

  // ==========================================
  // Advanced Caching Features
  // ==========================================

  /**
   * Set multiple values at once
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async setMany(keyValuePairs, ttl = 300) {
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const multi = client.multi();

        for (const [key, value] of Object.entries(keyValuePairs)) {
          const fullKey = this.getKey(key);
          multi.setEx(fullKey, ttl, JSON.stringify(value));
        }

        await multi.exec();
        this.stats.sets += Object.keys(keyValuePairs).length;
        return true;
      } catch (error) {
        logger.warn('Redis setMany error:', error.message);
      }
    }

    // Fallback to memory cache
    const expiry = Date.now() + (ttl * 1000);
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const fullKey = this.getKey(key);
      memoryCache.set(fullKey, value);
      memoryCacheExpiry.set(fullKey, expiry);
    }
    this.stats.sets += Object.keys(keyValuePairs).length;
    return true;
  }

  /**
   * Get multiple values at once
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>}
   */
  async getMany(keys) {
    const result = {};

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const fullKeys = keys.map(k => this.getKey(k));
        const values = await client.mGet(fullKeys);

        keys.forEach((key, index) => {
          if (values[index] !== null) {
            result[key] = JSON.parse(values[index]);
            this.stats.hits++;
          } else {
            result[key] = null;
            this.stats.misses++;
          }
        });

        return result;
      } catch (error) {
        logger.warn('Redis getMany error:', error.message);
      }
    }

    // Fallback to memory cache
    keys.forEach(key => {
      const fullKey = this.getKey(key);
      const value = memoryCache.get(fullKey);
      const expiry = memoryCacheExpiry.get(fullKey);

      if (value !== undefined && expiry > Date.now()) {
        result[key] = value;
        this.stats.hits++;
      } else {
        result[key] = null;
        this.stats.misses++;
      }
    });

    return result;
  }

  /**
   * Decorator factory for caching service methods
   * @param {string} keyPrefix - Key prefix
   * @param {number} ttl - Time to live in seconds
   * @param {Function} keyGenerator - Function to generate cache key from arguments
   * @returns {Function}
   */
  cacheMethod(keyPrefix, ttl = 300, keyGenerator = null) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args) {
        // Generate cache key
        const cacheKey = keyGenerator
          ? `${keyPrefix}:${keyGenerator(...args)}`
          : `${keyPrefix}:${JSON.stringify(args)}`;

        // Try cache first
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Cache result
        await cacheService.set(cacheKey, result, ttl);

        return result;
      };

      return descriptor;
    };
  }

  /**
   * Cache warming - preload frequently accessed data
   * @param {Object} warmupFunctions - Object with key-function pairs
   * @returns {Promise<void>}
   */
  async warmup(warmupFunctions) {
    logger.info('Starting cache warmup...');
    const startTime = Date.now();

    for (const [key, fetchFn] of Object.entries(warmupFunctions)) {
      try {
        const value = await fetchFn();
        await this.set(key, value, DEFAULT_TTL[key] || 300);
        logger.debug(`Warmed up cache: ${key}`);
      } catch (error) {
        logger.warn(`Failed to warm up cache for ${key}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`Cache warmup completed in ${duration}ms`);
  }

  /**
   * Create a namespaced cache instance
   * @param {string} namespace - Namespace prefix
   * @returns {Object}
   */
  namespace(namespace) {
    const self = this;
    return {
      get: (key) => self.get(`${namespace}:${key}`),
      set: (key, value, ttl) => self.set(`${namespace}:${key}`, value, ttl),
      del: (key) => self.del(`${namespace}:${key}`),
      getOrSet: (key, fetchFn, ttl) => self.getOrSet(`${namespace}:${key}`, fetchFn, ttl),
      invalidate: () => self.delPattern(`${namespace}:*`)
    };
  }

  /**
   * Create a cached function wrapper
   * @param {Function} fn - Function to cache
   * @param {string} keyPrefix - Key prefix
   * @param {number} ttl - Time to live in seconds
   * @param {Function} keyGen - Optional key generator
   * @returns {Function}
   */
  cachedFunction(fn, keyPrefix, ttl = 300, keyGen = null) {
    const self = this;

    return async function (...args) {
      const key = keyGen
        ? `${keyPrefix}:${keyGen(...args)}`
        : `${keyPrefix}:${JSON.stringify(args)}`;

      const cached = await self.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fn(...args);
      await self.set(key, result, ttl);
      return result;
    };
  }

  /**
   * Cache health check
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const testKey = '__health_check__';
    const testValue = { timestamp: Date.now() };

    try {
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.del(testKey);

      return {
        status: retrieved?.timestamp === testValue.timestamp ? 'healthy' : 'degraded',
        redis: isRedisConnected(),
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        redis: isRedisConnected(),
        stats: this.getStats()
      };
    }
  }

  /**
   * Cache invalidation strategies for different entities
   */
  invalidation = {
    /**
     * Invalidate all provider-related cache
     * @param {string} providerId - Provider ID
     */
    provider: async (providerId) => {
      await Promise.all([
        cacheService.delPattern(`providers:${providerId}*`),
        cacheService.delPattern('providers:list*'),
        cacheService.delPattern('modelPricing*')
      ]);
    },

    /**
     * Invalidate all user-related cache
     * @param {string} userId - User ID
     */
    user: async (userId) => {
      await Promise.all([
        cacheService.invalidateUser(userId),
        cacheService.delPattern(`user:settings:${userId}*`),
        cacheService.delPattern(`user:permissions:${userId}*`)
      ]);
    },

    /**
     * Invalidate all organization-related cache
     * @param {string} orgId - Organization ID
     */
    organization: async (orgId) => {
      await Promise.all([
        cacheService.invalidateOrganization(orgId),
        cacheService.delPattern(`org:settings:${orgId}*`),
        cacheService.delPattern(`org:members:${orgId}*`),
        cacheService.delPattern(`dashboard:${orgId}*`)
      ]);
    },

    /**
     * Invalidate calculation cache
     * @param {string} orgId - Organization ID
     */
    calculation: async (orgId) => {
      await cacheService.delPattern(`calculation:${orgId}*`);
    },

    /**
     * Invalidate analytics cache
     * @param {string} orgId - Organization ID
     */
    analytics: async (orgId) => {
      await cacheService.delPattern(`analytics:${orgId}*`);
    }
  };
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
export { DEFAULT_TTL };