/**
 * Cache Decorators and Helpers
 *
 * Utility functions and decorators for caching service methods.
 */

import cacheService from '../services/cache.service.js';
import logger from '../config/logger.js';

/**
 * Cache decorator for class methods
 * Usage: @cache('prefix', 300, (args) => `${args[0].id}`)
 *
 * @param {string} keyPrefix - Cache key prefix
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Optional function to generate cache key from method arguments
 * @returns {Function}
 */
export function cache(keyPrefix, ttl = 300, keyGenerator = null) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        try {
          cacheKey = `${keyPrefix}:${keyGenerator(...args)}`;
        } catch (error) {
          logger.warn(`Cache key generation error for ${propertyKey}:`, error.message);
          return originalMethod.apply(this, args);
        }
      } else {
        cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
      }

      // Try cache first
      try {
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache HIT for ${propertyKey}: ${cacheKey}`);
          return cached;
        }
      } catch (error) {
        logger.warn(`Cache get error for ${propertyKey}:`, error.message);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache result
      try {
        await cacheService.set(cacheKey, result, ttl);
        logger.debug(`Cache SET for ${propertyKey}: ${cacheKey}`);
      } catch (error) {
        logger.warn(`Cache set error for ${propertyKey}:`, error.message);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 * Usage: @invalidateCache('user', (args) => args[0].userId)
 *
 * @param {string} entityType - Type of entity to invalidate (user, org, provider)
 * @param {Function} entityIdGetter - Function to get entity ID from method arguments
 * @returns {Function}
 */
export function invalidateCache(entityType, entityIdGetter) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      // Execute original method first
      const result = await originalMethod.apply(this, args);

      // Then invalidate cache
      try {
        const entityId = entityIdGetter(...args, result);
        if (entityId) {
          await cacheService.invalidation[entityType]?.(entityId);
          logger.debug(`Cache invalidated for ${entityType}: ${entityId}`);
        }
      } catch (error) {
        logger.warn(`Cache invalidation error for ${propertyKey}:`, error.message);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache with namespace helper
 */
export class NamespacedCache {
  constructor(namespace) {
    this.namespace = namespace;
    this.cache = cacheService.namespace(namespace);
  }

  async get(key) {
    return this.cache.get(key);
  }

  async set(key, value, ttl = 300) {
    return this.cache.set(key, value, ttl);
  }

  async del(key) {
    return this.cache.del(key);
  }

  async getOrSet(key, fetchFn, ttl = 300) {
    return this.cache.getOrSet(key, fetchFn, ttl);
  }

  async invalidate() {
    return this.cache.invalidate();
  }
}

/**
 * Create a cached version of any async function
 * @param {Function} fn - Async function to cache
 * @param {string} keyPrefix - Cache key prefix
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGen - Optional key generator function
 * @returns {Function}
 */
export function cached(fn, keyPrefix, ttl = 300, keyGen = null) {
  return async (...args) => {
    const key = keyGen ? `${keyPrefix}:${keyGen(...args)}` : `${keyPrefix}:${JSON.stringify(args)}`;

    const cached = await cacheService.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    await cacheService.set(key, result, ttl);
    return result;
  };
}

/**
 * Memoize decorator - caches result indefinitely (or until manual invalidation)
 * Useful for expensive computations that don't change
 *
 * @param {string} keyPrefix - Cache key prefix
 * @param {Function} keyGenerator - Key generator function
 * @returns {Function}
 */
export function memoize(keyPrefix, keyGenerator = null) {
  const memoCache = new Map();

  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const key = keyGenerator
        ? `${keyPrefix}:${keyGenerator(...args)}`
        : `${keyPrefix}:${JSON.stringify(args)}`;

      if (memoCache.has(key)) {
        return memoCache.get(key);
      }

      const result = await originalMethod.apply(this, args);
      memoCache.set(key, result);
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache warming utilities
 */
export const cacheWarmup = {
  /**
   * Warm up cache with provider data
   * @param {Object} providerService - Provider service instance
   */
  async providers(providerService) {
    try {
      const providers = await providerService.getAllProviders();
      await cacheService.set('providers:list', providers, 3600);
      logger.info('Warmed up providers cache');
    } catch (error) {
      logger.warn('Failed to warm up providers cache:', error.message);
    }
  },

  /**
   * Warm up cache with model pricing data
   * @param {Object} pricingService - Pricing service instance
   */
  async modelPricing(pricingService) {
    try {
      const pricing = await pricingService.getAllModelPricing();
      await cacheService.set('modelPricing:all', pricing, 3600);
      logger.info('Warmed up model pricing cache');
    } catch (error) {
      logger.warn('Failed to warm up model pricing cache:', error.message);
    }
  },

  /**
   * Warm up cache with plan data
   * @param {Object} planService - Plan service instance
   */
  async plans(planService) {
    try {
      const plans = await planService.getAllPlans();
      await cacheService.set('plans:list', plans, 600);
      logger.info('Warmed up plans cache');
    } catch (error) {
      logger.warn('Failed to warm up plans cache:', error.message);
    }
  }
};

/**
 * Batch cache operations helper
 */
export const batchCache = {
  /**
   * Get multiple items with single fetch for missing items
   * @param {string[]} keys - Cache keys
   * @param {Function} fetchFn - Function to fetch missing items
   * @param {number} ttl - TTL for cached items
   * @returns {Promise<Object>}
   */
  async getOrFetchMany(keys, fetchFn, ttl = 300) {
    // Get all cached values
    const cached = await cacheService.getMany(keys);
    const result = { ...cached };
    const missingKeys = keys.filter(key => cached[key] === null);

    // Fetch missing items
    if (missingKeys.length > 0) {
      const fetched = await fetchFn(missingKeys);

      // Cache fetched items
      const toCache = {};
      for (const key of missingKeys) {
        if (fetched[key] !== undefined) {
          result[key] = fetched[key];
          toCache[key] = fetched[key];
        }
      }

      await cacheService.setMany(toCache, ttl);
    }

    return result;
  },

  /**
   * Set multiple items with computed TTLs
   * @param {Object} items - Key-value pairs
   * @param {Function} ttlFn - Function to compute TTL for each key
   * @returns {Promise<void>}
   */
  async setWithTTL(items, ttlFn) {
    if (cacheService.redisConnected) {
      const client = cacheService.getRedisClient?.();
      if (client) {
        const multi = client.multi();
        for (const [key, value] of Object.entries(items)) {
          const ttl = ttlFn(key, value);
          multi.setEx(cacheService.getKey(key), ttl, JSON.stringify(value));
        }
        await multi.exec();
      }
    } else {
      for (const [key, value] of Object.entries(items)) {
        const ttl = ttlFn(key, value);
        await cacheService.set(key, value, ttl);
      }
    }
  }
};

export default {
  cache,
  invalidateCache,
  NamespacedCache,
  cached,
  memoize,
  cacheWarmup,
  batchCache
};