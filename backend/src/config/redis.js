/**
 * Redis Configuration
 *
 * Handles Redis connection for caching and sessions.
 */

import { createClient } from 'redis';
import config from './index.js';
import logger from './logger.js';

let redisClient = null;
let isConnected = false;

/**
 * Connect to Redis
 * @returns {Promise<void>}
 */
const connectRedis = async () => {
  // Allow connection to localhost Redis for development
  const isDefaultLocalhost = config.redis.url === 'redis://localhost:6379';
  const shouldSkipRedis = process.env.SKIP_REDIS === 'true';

  if (shouldSkipRedis) {
    logger.info('Redis skipped by configuration, running without cache');
    return;
  }

  try {
    redisClient = createClient({
      url: config.redis.url,
      password: config.redis.password || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          // Stop retrying after 3 attempts
          if (retries >= 3) {
            logger.warn('Redis connection failed after 3 retries, running without cache');
            return new Error('Redis connection failed');
          }
          // Retry with exponential backoff
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 5000
      }
    });

    redisClient.on('error', (err) => {
      if (isConnected) {
        logger.error('Redis Client Error:', err.message);
      }
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Redis Connected');
    });

    redisClient.on('disconnect', () => {
      isConnected = false;
      logger.warn('Redis Disconnected');
    });

    await redisClient.connect();

  } catch (error) {
    logger.warn('Redis connection error, running without cache:', error.message);
    redisClient = null;
  }
};

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
const disconnectRedis = async () => {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Redis disconnection error:', error.message);
    }
  }
};

/**
 * Get Redis client
 * @returns {Object|null}
 */
const getRedisClient = () => {
  if (!redisClient || !isConnected) {
    return null;
  }
  return redisClient;
};

/**
 * Check if Redis is connected
 * @returns {boolean}
 */
const isRedisConnected = () => isConnected;

export { connectRedis, disconnectRedis, getRedisClient, isRedisConnected };
export default connectRedis;