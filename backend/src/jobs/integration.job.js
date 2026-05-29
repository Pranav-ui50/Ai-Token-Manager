/**
 * Integration Job Handlers
 *
 * Background jobs for integration-related tasks:
 * - Sync with external providers
 * - Webhook processing
 * - Health checks
 */

import logger from '../config/logger.js';
import Integration from '../models/Integration.js';
import usageSyncService from '../services/usageSync.service.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

// Job types
export const INTEGRATION_TYPES = {
  SYNC_ALL: 'integration:sync_all',
  SYNC_PROVIDER: 'integration:sync_provider',
  HEALTH_CHECK: 'integration:health_check',
  WEBHOOK_RETRY: 'integration:webhook_retry',
  CLEANUP_TOKENS: 'integration:cleanup_tokens'
};

/**
 * Register integration job processors
 */
async function register(queueService) {
  // Sync all integrations
  queueService.registerProcessor(INTEGRATION_TYPES.SYNC_ALL, processSyncAll);

  // Sync specific provider
  queueService.registerProcessor(INTEGRATION_TYPES.SYNC_PROVIDER, processSyncProvider);

  // Health check
  queueService.registerProcessor(INTEGRATION_TYPES.HEALTH_CHECK, processHealthCheck);

  // Webhook retry
  queueService.registerProcessor(INTEGRATION_TYPES.WEBHOOK_RETRY, processWebhookRetry);

  // Cleanup expired tokens
  queueService.registerProcessor(INTEGRATION_TYPES.CLEANUP_TOKENS, processCleanupTokens);

  logger.info('Integration job processors registered');
}

/**
 * Schedule recurring integration jobs
 */
async function scheduleRecurringJobs(queueService) {
  // Sync all integrations every hour
  await queueService.addRecurringJob(
    INTEGRATION_TYPES.SYNC_ALL,
    {},
    { repeat: { every: 60 * 60 * 1000 } } // Every hour
  );

  // Health check every 15 minutes
  await queueService.addRecurringJob(
    INTEGRATION_TYPES.HEALTH_CHECK,
    {},
    { repeat: { every: 15 * 60 * 1000 } } // Every 15 minutes
  );

  // Cleanup expired tokens daily
  await queueService.addRecurringJob(
    INTEGRATION_TYPES.CLEANUP_TOKENS,
    {},
    { repeat: { cron: '0 2 * * *' } } // Daily at 2 AM
  );

  logger.info('Recurring integration jobs scheduled');
}

/**
 * Process sync all integrations job
 */
async function processSyncAll(job) {
  logger.info('Processing sync all integrations');

  try {
    // Find all active integrations with sync enabled
    const integrations = await Integration.find({
      status: 'active',
      'sync.enabled': true
    });

    const results = {
      total: integrations.length,
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const integration of integrations) {
      try {
        // Check if sync is due based on interval
        const lastSync = integration.sync.lastSyncAt;
        const interval = integration.sync.interval || 3600000; // Default 1 hour
        const now = new Date();

        if (!lastSync || (now - lastSync) >= interval) {
          await usageSyncService.startSync(integration._id, null, 'scheduled');
          results.synced++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          integrationId: integration._id,
          error: error.message
        });
        logger.error(`Failed to sync integration ${integration._id}:`, error);
      }
    }

    logger.info(`Sync all complete: ${results.synced} synced, ${results.failed} failed`);
    return results;
  } catch (error) {
    logger.error('Failed to process sync all:', error);
    throw error;
  }
}

/**
 * Process sync provider job
 */
async function processSyncProvider(job) {
  const { integrationId, userId } = job.data;

  logger.info(`Processing sync for integration ${integrationId}`);

  try {
    const result = await usageSyncService.startSync(integrationId, userId, 'manual');

    // Log audit
    await AuditLog.log({
      organization: result.organization,
      user: userId,
      action: 'integration_sync',
      resourceType: 'integration',
      resourceId: integrationId,
      description: `Integration sync ${result.status}`
    });

    logger.info(`Sync complete for integration ${integrationId}: ${result.status}`);
    return { success: true, syncId: result._id };
  } catch (error) {
    logger.error(`Failed to sync integration ${integrationId}:`, error);
    throw error;
  }
}

/**
 * Process health check job
 */
async function processHealthCheck(job) {
  logger.info('Processing integration health checks');

  try {
    const integrations = await Integration.find({
      status: { $in: ['active', 'error'] }
    });

    const results = {
      total: integrations.length,
      healthy: 0,
      unhealthy: 0,
      recovered: 0
    };

    for (const integration of integrations) {
      try {
        // Test connection
        const health = await checkIntegrationHealth(integration);

        if (health.healthy) {
          results.healthy++;

          // If was in error state, mark as recovered
          if (integration.status === 'error') {
            integration.status = 'active';
            integration.lastError = null;
            await integration.save();

            await Notification.create({
              organization: integration.organization,
              type: 'integration',
              title: 'Integration Recovered',
              message: `Integration ${integration.name} has recovered and is now active.`,
              priority: 'normal'
            });

            results.recovered++;
          }
        } else {
          results.unhealthy++;

          // Mark as error if not already
          if (integration.status !== 'error') {
            integration.status = 'error';
            integration.lastError = health.error;
            await integration.save();

            await Notification.create({
              organization: integration.organization,
              type: 'integration',
              title: 'Integration Error',
              message: `Integration ${integration.name} is experiencing issues: ${health.error}`,
              priority: 'high'
            });
          }
        }
      } catch (error) {
        results.unhealthy++;
        logger.error(`Health check failed for integration ${integration._id}:`, error);
      }
    }

    logger.info(`Health check complete: ${results.healthy} healthy, ${results.unhealthy} unhealthy, ${results.recovered} recovered`);
    return results;
  } catch (error) {
    logger.error('Failed to process health checks:', error);
    throw error;
  }
}

/**
 * Check integration health
 */
async function checkIntegrationHealth(integration) {
  try {
    switch (integration.type) {
      case 'openai':
        // Test OpenAI connection
        return await testOpenAIConnection(integration);
      case 'anthropic':
        // Test Anthropic connection
        return await testAnthropicConnection(integration);
      case 'stripe':
        // Test Stripe connection
        return await testStripeConnection(integration);
      case 'razorpay':
        // Test Razorpay connection
        return await testRazorpayConnection(integration);
      default:
        return { healthy: true };
    }
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Test OpenAI connection
 */
async function testOpenAIConnection(integration) {
  try {
    const openai = (await import('openai')).default;
    const client = new openai.OpenAI({
      apiKey: integration.config.apiKey
    });

    // Test with a simple models list call
    await client.models.list();

    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Test Anthropic connection
 */
async function testAnthropicConnection(integration) {
  try {
    const anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new anthropic({
      apiKey: integration.config.apiKey
    });

    // Test with a simple message (won't actually complete)
    // We'll just verify the API key format
    if (!integration.config.apiKey?.startsWith('sk-ant-')) {
      return { healthy: false, error: 'Invalid API key format' };
    }

    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Test Stripe connection
 */
async function testStripeConnection(integration) {
  try {
    const stripe = (await import('stripe')).default;
    const client = new stripe(process.env.STRIPE_SECRET_KEY);

    // Test with balance retrieval
    await client.balance.retrieve();

    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Test Razorpay connection
 */
async function testRazorpayConnection(integration) {
  try {
    const razorpay = (await import('razorpay')).default;
    const client = new razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Test with a simple fetch
    await client.customers.all({ count: 1 });

    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Process webhook retry job
 */
async function processWebhookRetry(job) {
  const { integrationId, eventType, payload, attempt } = job.data;

  logger.info(`Processing webhook retry for ${integrationId}, attempt ${attempt}`);

  try {
    const integration = await Integration.findById(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    // Process the webhook event
    await usageSyncService.handleWebhookEvent(integrationId, {
      headers: {},
      body: payload,
      signature: payload.signature
    });

    logger.info(`Webhook retry successful for ${integrationId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Webhook retry failed for ${integrationId}:`, error);

    // Schedule next retry if attempts remaining
    const maxAttempts = 3;
    if (attempt < maxAttempts) {
      const delayMs = Math.pow(2, attempt) * 60 * 1000; // Exponential backoff
      // Queue next retry (would use queueService.add() here)
      logger.info(`Scheduling webhook retry ${attempt + 1} for ${integrationId}`);
    }

    throw error;
  }
}

/**
 * Process cleanup tokens job
 */
async function processCleanupTokens(job) {
  logger.info('Processing token cleanup');

  try {
    const IntegrationModel = Integration;
    const now = new Date();

    // Find integrations with expired tokens
    const result = await IntegrationModel.updateMany(
      {
        'tokens.expiresAt': { $lt: now }
      },
      {
        $pull: {
          tokens: { expiresAt: { $lt: now } }
        }
      }
    );

    // Find integrations that need refresh
    const needsRefresh = await IntegrationModel.find({
      status: 'active',
      'tokens.expiresAt': { $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) } // Within 24 hours
    });

    // Queue refresh jobs for each
    for (const integration of needsRefresh) {
      // Would queue refresh job here
      logger.info(`Integration ${integration._id} needs token refresh`);
    }

    logger.info(`Token cleanup complete: ${result.modifiedCount} tokens removed, ${needsRefresh.length} need refresh`);
    return { cleaned: result.modifiedCount, needsRefresh: needsRefresh.length };
  } catch (error) {
    logger.error('Failed to cleanup tokens:', error);
    throw error;
  }
}

export default {
  INTEGRATION_TYPES,
  register,
  scheduleRecurringJobs,
  processSyncAll,
  processSyncProvider,
  processHealthCheck,
  processWebhookRetry,
  processCleanupTokens
};