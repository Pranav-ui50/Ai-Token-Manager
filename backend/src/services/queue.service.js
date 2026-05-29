/**
 * Queue Service
 *
 * Background job processing using Bull queue (Redis-backed).
 * Handles heavy operations like reports, emails, and simulations.
 */

import Queue from 'bull';
import { getRedisClient, isRedisConnected } from '../config/redis.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

// In-memory queue fallback for when Redis is not available
const memoryQueues = new Map();

// Queue configurations
const QUEUE_CONFIG = {
  // Email queue - notifications, password resets, etc.
  email: {
    name: 'email',
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000 // 100 emails per minute
    }
  },
  // Report generation queue
  report: {
    name: 'report',
    concurrency: 2,
    limiter: {
      max: 20,
      duration: 3600000 // 20 reports per hour
    }
  },
  // Simulation queue
  simulation: {
    name: 'simulation',
    concurrency: 3,
    limiter: {
      max: 50,
      duration: 60000 // 50 simulations per minute
    }
  },
  // Usage sync queue - sync with AI providers
  usageSync: {
    name: 'usageSync',
    concurrency: 2,
    limiter: {
      max: 30,
      duration: 60000 // 30 syncs per minute
    }
  },
  // Analytics aggregation queue
  analytics: {
    name: 'analytics',
    concurrency: 2,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
  // Cleanup queue - scheduled maintenance tasks
  cleanup: {
    name: 'cleanup',
    concurrency: 1,
    limiter: {
      max: 10,
      duration: 60000
    }
  }
};

// Store queue instances
const queues = new Map();

/**
 * Queue Service Class
 */
class QueueService {
  constructor() {
    this.initialized = false;
    this.redisAvailable = false;
  }

  /**
   * Initialize all queues
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    this.redisAvailable = isRedisConnected();

    if (this.redisAvailable) {
      // Initialize Bull queues
      for (const [key, queueConfig] of Object.entries(QUEUE_CONFIG)) {
        await this.createBullQueue(queueConfig);
      }
      logger.info('Bull queues initialized');
    } else {
      // Use memory fallback
      logger.info('Redis not available, using in-memory queue fallback');
    }

    this.initialized = true;
  }

  /**
   * Create a Bull queue
   * @param {Object} queueConfig - Queue configuration
   * @returns {Queue}
   */
  async createBullQueue(queueConfig) {
    const { name, concurrency, limiter } = queueConfig;

    const queue = new Queue(name, {
      redis: config.redis.url,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      },
      limiter
    });

    // Event handlers
    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} in queue ${name} completed:`, result);
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} in queue ${name} failed:`, err.message);
    });

    queue.on('error', (err) => {
      logger.error(`Queue ${name} error:`, err.message);
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} in queue ${name} stalled`);
    });

    queues.set(name, queue);
    return queue;
  }

  /**
   * Get a queue by name
   * @param {string} name - Queue name
   * @returns {Queue|null}
   */
  getQueue(name) {
    return queues.get(name);
  }

  /**
   * Add a job to a queue
   * @param {string} queueName - Queue name
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Object>}
   */
  async addJob(queueName, data, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.debug(`Job ${job.id} added to queue ${queueName}`);
      return {
        id: job.id,
        name: job.name,
        data: job.data
      };
    }

    // Memory fallback - process immediately
    return this.processMemoryJob(queueName, data, options);
  }

  /**
   * Process job in memory (fallback)
   * @param {string} queueName - Queue name
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Object>}
   */
  async processMemoryJob(queueName, data, options) {
    const jobId = `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.debug(`Processing memory job ${jobId} for queue ${queueName}`);

    // Get processor for this queue type
    const processor = this.getMemoryProcessor(queueName);
    if (processor) {
      try {
        const result = await processor(data);
        return { id: jobId, result };
      } catch (error) {
        logger.error(`Memory job ${jobId} failed:`, error.message);
        throw error;
      }
    }

    return { id: jobId, queued: true };
  }

  /**
   * Get memory processor for queue type
   * @param {string} queueName - Queue name
   * @returns {Function|null}
   */
  getMemoryProcessor(queueName) {
    // These will be set by registerProcessor
    return memoryQueues.get(queueName)?.processor;
  }

  /**
   * Register a processor for a queue
   * @param {string} queueName - Queue name
   * @param {Function} processor - Processor function
   * @param {number} concurrency - Concurrency level
   */
  async registerProcessor(queueName, processor, concurrency = 1) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (queue) {
        queue.process(concurrency, async (job) => {
          return processor(job.data, job);
        });
        logger.info(`Processor registered for queue ${queueName}`);
      }
    } else {
      // Store processor for memory fallback
      memoryQueues.set(queueName, { processor });
      logger.info(`Memory processor registered for queue ${queueName}`);
    }
  }

  /**
   * Get job by ID
   * @param {string} queueName - Queue name
   * @param {string} jobId - Job ID
   * @returns {Promise<Object|null>}
   */
  async getJob(queueName, jobId) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (!queue) return null;

      const job = await queue.getJob(jobId);
      if (!job) return null;

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress(),
        returnValue: job.returnvalue,
        state: await job.getState(),
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason
      };
    }

    return null;
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Queue name
   * @returns {Promise<Object>}
   */
  async getQueueStats(queueName) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (!queue) return null;

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);

      return {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    }

    return {
      name: queueName,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      mode: 'memory'
    };
  }

  /**
   * Get all queue statistics
   * @returns {Promise<Object>}
   */
  async getAllQueueStats() {
    const stats = {};

    for (const queueName of Object.keys(QUEUE_CONFIG)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return {
      queues: stats,
      redisConnected: this.redisAvailable,
      mode: this.redisAvailable ? 'bull' : 'memory'
    };
  }

  /**
   * Pause a queue
   * @param {string} queueName - Queue name
   * @returns {Promise<void>}
   */
  async pauseQueue(queueName) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (queue) {
        await queue.pause();
        logger.info(`Queue ${queueName} paused`);
      }
    }
  }

  /**
   * Resume a queue
   * @param {string} queueName - Queue name
   * @returns {Promise<void>}
   */
  async resumeQueue(queueName) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (queue) {
        await queue.resume();
        logger.info(`Queue ${queueName} resumed`);
      }
    }
  }

  /**
   * Clear a queue (remove all jobs)
   * @param {string} queueName - Queue name
   * @returns {Promise<void>}
   */
  async clearQueue(queueName) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (queue) {
        await queue.empty();
        logger.info(`Queue ${queueName} cleared`);
      }
    }
  }

  /**
   * Close all queues
   * @returns {Promise<void>}
   */
  async closeAll() {
    if (this.redisAvailable) {
      for (const [name, queue] of queues.entries()) {
        try {
          await queue.close();
          logger.info(`Queue ${name} closed`);
        } catch (error) {
          logger.error(`Error closing queue ${name}:`, error.message);
        }
      }
      queues.clear();
    }

    this.initialized = false;
  }

  /**
   * Schedule a recurring job
   * @param {string} queueName - Queue name
   * @param {string} jobName - Job name
   * @param {Object} data - Job data
   * @param {string} cron - Cron expression
   * @returns {Promise<void>}
   */
  async scheduleRecurring(queueName, jobName, data, cron) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (queue) {
        await queue.add(jobName, data, {
          repeat: { cron }
        });
        logger.info(`Scheduled recurring job ${jobName} in queue ${queueName}`);
      }
    }
  }

  /**
   * Remove a recurring job
   * @param {string} queueName - Queue name
   * @param {string} jobName - Job name
   * @returns {Promise<void>}
   */
  async removeRecurring(queueName, jobName) {
    if (this.redisAvailable) {
      const queue = this.getQueue(queueName);
      if (queue) {
        const jobs = await queue.getRepeatableJobs();
        const job = jobs.find(j => j.name === jobName);
        if (job) {
          await queue.removeRepeatableByKey(job.key);
          logger.info(`Removed recurring job ${jobName} from queue ${queueName}`);
        }
      }
    }
  }
}

// Export singleton instance
const queueService = new QueueService();
export default queueService;
export { QUEUE_CONFIG };