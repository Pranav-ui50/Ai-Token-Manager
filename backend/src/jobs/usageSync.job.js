/**
 * Usage Sync Job Processor
 *
 * Processes usage synchronization jobs from external AI providers.
 */

import logger from '../config/logger.js';
import Integration from '../models/Integration.js';
import Feature from '../models/Feature.js';
import integrationService from '../services/integration.service.js';

/**
 * Sync types
 */
const SYNC_TYPES = {
  OPENAI_USAGE: 'openai_usage',
  ANTHROPIC_USAGE: 'anthropic_usage',
  STRIPE_DATA: 'stripe_data',
  RAZORPAY_DATA: 'razorpay_data',
  FULL_SYNC: 'full_sync',
  DELTA_SYNC: 'delta_sync'
};

/**
 * Process usage sync job
 * @param {Object} data - Job data
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>}
 */
async function processUsageSyncJob(data, job) {
  const {
    organizationId,
    integrationId,
    type,
    parameters = {},
    options = {}
  } = data;

  logger.info(`Processing usage sync job: ${type} for organization ${organizationId}`);

  try {
    // Update job progress
    if (job) {
      job.progress(5);
    }

    let result;

    // Get integration details
    let integration = null;
    if (integrationId) {
      integration = await Integration.findById(integrationId);
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`);
      }
    }

    switch (type) {
      case SYNC_TYPES.OPENAI_USAGE:
        result = await syncOpenAIUsage(organizationId, integration, parameters);
        break;

      case SYNC_TYPES.ANTHROPIC_USAGE:
        result = await syncAnthropicUsage(organizationId, integration, parameters);
        break;

      case SYNC_TYPES.STRIPE_DATA:
        result = await syncStripeData(organizationId, integration, parameters);
        break;

      case SYNC_TYPES.RAZORPAY_DATA:
        result = await syncRazorpayData(organizationId, integration, parameters);
        break;

      case SYNC_TYPES.FULL_SYNC:
        result = await performFullSync(organizationId, parameters);
        break;

      case SYNC_TYPES.DELTA_SYNC:
        result = await performDeltaSync(organizationId, parameters);
        break;

      default:
        throw new Error(`Unknown sync type: ${type}`);
    }

    // Update integration last sync time
    if (integration) {
      await Integration.findByIdAndUpdate(integrationId, {
        lastSync: new Date(),
        lastSyncStatus: 'success',
        lastSyncResult: {
          recordsProcessed: result.recordsProcessed || 0,
          recordsUpdated: result.recordsUpdated || 0,
          errors: result.errors || []
        }
      });
    }

    logger.info(`Usage sync job completed: ${type} for organization ${organizationId}`);

    return {
      success: true,
      organizationId,
      type,
      recordsProcessed: result.recordsProcessed || 0,
      recordsUpdated: result.recordsUpdated || 0,
      syncedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Usage sync job failed: ${type}`, error.message);

    // Update integration last sync status
    if (integrationId) {
      await Integration.findByIdAndUpdate(integrationId, {
        lastSync: new Date(),
        lastSyncStatus: 'failed',
        lastSyncError: error.message
      });
    }

    throw error;
  }
}

/**
 * Sync OpenAI usage data
 * @param {string} organizationId - Organization ID
 * @param {Object} integration - Integration object
 * @param {Object} parameters - Sync parameters
 * @returns {Promise<Object>}
 */
async function syncOpenAIUsage(organizationId, integration, parameters) {
  const { startDate, endDate } = parameters;

  // Use integration service to sync
  const result = await integrationService.syncProviderUsage(organizationId, 'openai', {
    apiKey: integration?.credentials?.apiKey,
    startDate,
    endDate
  });

  // Update feature usage history
  await updateFeatureUsageHistory(organizationId, result.usageData || []);

  return {
    recordsProcessed: result.usageData?.length || 0,
    recordsUpdated: result.usageData?.length || 0,
    usageData: result.usageData
  };
}

/**
 * Sync Anthropic usage data
 * @param {string} organizationId - Organization ID
 * @param {Object} integration - Integration object
 * @param {Object} parameters - Sync parameters
 * @returns {Promise<Object>}
 */
async function syncAnthropicUsage(organizationId, integration, parameters) {
  const { startDate, endDate } = parameters;

  const result = await integrationService.syncProviderUsage(organizationId, 'anthropic', {
    apiKey: integration?.credentials?.apiKey,
    startDate,
    endDate
  });

  await updateFeatureUsageHistory(organizationId, result.usageData || []);

  return {
    recordsProcessed: result.usageData?.length || 0,
    recordsUpdated: result.usageData?.length || 0,
    usageData: result.usageData
  };
}

/**
 * Sync Stripe data
 * @param {string} organizationId - Organization ID
 * @param {Object} integration - Integration object
 * @param {Object} parameters - Sync parameters
 * @returns {Promise<Object>}
 */
async function syncStripeData(organizationId, integration, parameters) {
  const { startDate, endDate } = parameters;

  const result = await integrationService.syncPaymentData(organizationId, 'stripe', {
    secretKey: integration?.credentials?.secretKey,
    startDate,
    endDate
  });

  return {
    recordsProcessed: result.transactions?.length || 0,
    recordsUpdated: result.transactions?.length || 0,
    transactions: result.transactions
  };
}

/**
 * Sync Razorpay data
 * @param {string} organizationId - Organization ID
 * @param {Object} integration - Integration object
 * @param {Object} parameters - Sync parameters
 * @returns {Promise<Object>}
 */
async function syncRazorpayData(organizationId, integration, parameters) {
  const { startDate, endDate } = parameters;

  const result = await integrationService.syncPaymentData(organizationId, 'razorpay', {
    keyId: integration?.credentials?.keyId,
    keySecret: integration?.credentials?.keySecret,
    startDate,
    endDate
  });

  return {
    recordsProcessed: result.transactions?.length || 0,
    recordsUpdated: result.transactions?.length || 0,
    transactions: result.transactions
  };
}

/**
 * Perform full sync for all integrations
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Sync parameters
 * @returns {Promise<Object>}
 */
async function performFullSync(organizationId, parameters) {
  const integrations = await Integration.find({
    organization: organizationId,
    isActive: true
  });

  let totalProcessed = 0;
  let totalUpdated = 0;
  const errors = [];

  for (const integration of integrations) {
    try {
      let result;

      if (integration.type === 'openai' || integration.type === 'anthropic') {
        result = await integrationService.syncProviderUsage(
          organizationId,
          integration.type,
          { apiKey: integration.credentials?.apiKey }
        );
      } else if (integration.type === 'stripe' || integration.type === 'razorpay') {
        result = await integrationService.syncPaymentData(
          organizationId,
          integration.type,
          integration.credentials
        );
      }

      totalProcessed += result?.recordsProcessed || 0;
      totalUpdated += result?.recordsUpdated || 0;

    } catch (error) {
      errors.push({
        integration: integration.name,
        error: error.message
      });
    }
  }

  return {
    recordsProcessed: totalProcessed,
    recordsUpdated: totalUpdated,
    errors
  };
}

/**
 * Perform delta sync (only changes since last sync)
 * @param {string} organizationId - Organization ID
 * @param {Object} parameters - Sync parameters
 * @returns {Promise<Object>}
 */
async function performDeltaSync(organizationId, parameters) {
  const { since } = parameters;

  // Get integrations with last sync before 'since' date
  const integrations = await Integration.find({
    organization: organizationId,
    isActive: true,
    lastSync: { $lt: new Date(since) }
  });

  let totalProcessed = 0;
  let totalUpdated = 0;

  for (const integration of integrations) {
    const result = await integrationService.syncProviderUsage(
      organizationId,
      integration.type,
      {
        ...integration.credentials,
        since: integration.lastSync
      }
    );

    totalProcessed += result?.recordsProcessed || 0;
    totalUpdated += result?.recordsUpdated || 0;
  }

  return {
    recordsProcessed: totalProcessed,
    recordsUpdated: totalUpdated
  };
}

/**
 * Update feature usage history from sync data
 * @param {string} organizationId - Organization ID
 * @param {Array} usageData - Usage data array
 */
async function updateFeatureUsageHistory(organizationId, usageData) {
  for (const data of usageData) {
    if (data.featureId) {
      const feature = await Feature.findOne({
        _id: data.featureId,
        organization: organizationId
      });

      if (feature) {
        await feature.recordUsage({
          requests: data.requests || 1,
          tokens: data.tokens || 0,
          inputTokens: data.inputTokens || 0,
          outputTokens: data.outputTokens || 0,
          cost: data.cost || 0,
          errors: data.errors || 0,
          avgLatency: data.avgLatency || 0
        });
      }
    }
  }
}

/**
 * Register usage sync processor with queue service
 * @param {Object} queueService - Queue service instance
 */
async function register(queueService) {
  await queueService.registerProcessor('usageSync', processUsageSyncJob, 2);
  logger.info('Usage sync job processor registered');
}

export default {
  process: processUsageSyncJob,
  register,
  SYNC_TYPES
};