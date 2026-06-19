/**
 * Jobs Index
 *
 * Initializes and registers all job processors.
 */

import logger from '../config/logger.js';
import queueService from '../services/queue.service.js';

// Import job processors
import emailJob from './email.job.js';
import reportJob from './report.job.js';
import simulationJob from './simulation.job.js';
import usageSyncJob from './usageSync.job.js';
import analyticsJob from './analytics.job.js';
import cleanupJob from './cleanup.job.js';
import billingJob from './billing.job.js';
import integrationJob from './integration.job.js';
import subscriptionJob from './subscription.job.js';

/**
 * Initialize all job processors
 */
async function initializeJobs() {
  try {
    // Initialize queue service
    await queueService.initialize();

    // Register all processors
    await emailJob.register(queueService);
    await reportJob.register(queueService);
    await simulationJob.register(queueService);
    await usageSyncJob.register(queueService);
    await analyticsJob.register(queueService);
    await cleanupJob.register(queueService);
    await billingJob.register(queueService);
    await integrationJob.register(queueService);

    // Schedule recurring jobs
    await cleanupJob.scheduleRecurringCleanups(queueService);
    await billingJob.scheduleRecurringJobs(queueService);
    await integrationJob.scheduleRecurringJobs(queueService);

    // Start subscription cron jobs (uses node-cron directly)
    subscriptionJob.start();

    logger.info('All job processors initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize job processors:', error.message);
    throw error;
  }
}

/**
 * Shutdown all jobs
 */
async function shutdownJobs() {
  try {
    await queueService.closeAll();
    logger.info('All job processors shut down');
  } catch (error) {
    logger.error('Failed to shutdown job processors:', error.message);
  }
}

// Export job types for external use
export const JOB_TYPES = {
  EMAIL: emailJob.JOB_TYPES,
  REPORT: reportJob.REPORT_TYPES,
  SIMULATION: simulationJob.SIMULATION_TYPES,
  USAGE_SYNC: usageSyncJob.SYNC_TYPES,
  ANALYTICS: analyticsJob.ANALYTICS_TYPES,
  CLEANUP: cleanupJob.CLEANUP_TYPES,
  BILLING: billingJob.BILLING_TYPES,
  INTEGRATION: integrationJob.INTEGRATION_TYPES
};

// Export output formats
export const OUTPUT_FORMATS = reportJob.OUTPUT_FORMATS;

// Export functions
export {
  initializeJobs,
  shutdownJobs,
  queueService,
  emailJob,
  reportJob,
  simulationJob,
  usageSyncJob,
  analyticsJob,
  cleanupJob,
  billingJob,
  integrationJob
};

export default {
  initialize: initializeJobs,
  shutdown: shutdownJobs,
  queueService,
  JOB_TYPES,
  OUTPUT_FORMATS
};