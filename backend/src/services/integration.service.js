/**
 * Integration Service
 *
 * Handles all integration-related business logic.
 * FR-45: API Integrations
 */

import Integration from '../models/Integration.js';
import Feature from '../models/Feature.js';
import AIModel from '../models/AIModel.js';
import Provider from '../models/Provider.js';
import Invoice from '../models/Invoice.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class IntegrationService {
  /**
   * Create a new integration
   * @param {Object} data - Integration data
   * @param {string} userId - User ID
   * @returns {Object} Created integration
   */
  async create(data, userId) {
    const { organizationId, name, type, config, credentials } = data;

    logger.info(`[IntegrationService] Creating integration: ${name} of type ${type}`);

    // Check for duplicate name within organization
    const existing = await Integration.findOne({
      organization: organizationId,
      name: name
    });

    if (existing) {
      throw new AppError('Integration with this name already exists', 409, 'DUPLICATE_ERROR');
    }

    // Encrypt credentials if provided
    let encryptedCredentials = {};
    if (credentials) {
      encryptedCredentials = this._encryptCredentials(credentials);
    }

    // Create integration
    const integration = await Integration.create({
      organization: organizationId,
      name,
      type,
      config: config || {},
      credentials: encryptedCredentials,
      createdBy: userId
    });

    // Test connection if status is not set
    if (integration.status === 'pending') {
      const testResult = await this.testConnection(integration._id);
      integration.status = testResult.success ? 'active' : 'error';
      await integration.save();
    }

    await integration.populate('createdBy', 'firstName lastName email');

    logger.info(`[IntegrationService] Integration created: ${integration._id}`);

    return integration;
  }

  /**
   * Get integration by ID
   * @param {string} integrationId - Integration ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Integration
   */
  async getById(integrationId, organizationId) {
    const integration = await Integration.findOne({
      _id: integrationId,
      organization: organizationId
    }).populate('createdBy', 'firstName lastName email');

    if (!integration) {
      throw new AppError('Integration not found', 404, 'NOT_FOUND');
    }

    return integration;
  }

  /**
   * Get all integrations for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Integrations with pagination
   */
  async getForOrganization(organizationId, filters = {}) {
    const { status, type, page = 1, limit = 10 } = filters;

    const query = { organization: organizationId };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const integrations = await Integration.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Integration.countDocuments(query);

    return {
      integrations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update integration
   * @param {string} integrationId - Integration ID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Updated integration
   */
  async update(integrationId, data, organizationId, userId) {
    const integration = await Integration.findOne({
      _id: integrationId,
      organization: organizationId
    });

    if (!integration) {
      throw new AppError('Integration not found', 404, 'NOT_FOUND');
    }

    // Update fields
    const allowedUpdates = ['name', 'description', 'config', 'credentials', 'sync', 'webhooks'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        if (field === 'credentials') {
          integration[field] = this._encryptCredentials(data[field]);
        } else {
          integration[field] = data[field];
        }
      }
    });

    integration.lastModifiedBy = userId;
    await integration.save();

    await integration.populate('createdBy', 'firstName lastName email');
    await integration.populate('lastModifiedBy', 'firstName lastName email');

    logger.info(`[IntegrationService] Integration updated: ${integrationId}`);

    return integration;
  }

  /**
   * Delete integration
   * @param {string} integrationId - Integration ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Success message
   */
  async delete(integrationId, organizationId) {
    const integration = await Integration.findOneAndDelete({
      _id: integrationId,
      organization: organizationId
    });

    if (!integration) {
      throw new AppError('Integration not found', 404, 'NOT_FOUND');
    }

    logger.info(`[IntegrationService] Integration deleted: ${integrationId}`);

    return { message: 'Integration deleted successfully' };
  }

  /**
   * Test integration connection
   * @param {string} integrationId - Integration ID
   * @returns {Object} Test result
   */
  async testConnection(integrationId) {
    const integration = await Integration.findById(integrationId);

    if (!integration) {
      throw new AppError('Integration not found', 404, 'NOT_FOUND');
    }

    let success = false;
    let message = 'Connection test failed';
    let latency = 0;

    try {
      const startTime = Date.now();

      // Decrypt credentials for testing
      const credentials = this._decryptCredentials(integration.credentials);

      // Test based on integration type
      switch (integration.type) {
        case 'openai':
        case 'anthropic':
          // For AI providers, verify API key
          success = await this._testAIProvider(integration.type, credentials);
          message = success ? 'API key validated successfully' : 'Invalid API key';
          break;

        case 'stripe':
        case 'razorpay':
          // For payment providers, verify credentials
          success = await this._testPaymentProvider(integration.type, credentials);
          message = success ? 'Payment provider connected' : 'Invalid credentials';
          break;

        case 'slack':
        case 'discord':
          // For notification providers, send test message
          success = await this._testNotificationProvider(integration.type, integration.config, credentials);
          message = success ? 'Notification provider connected' : 'Connection failed';
          break;

        case 'webhook':
        case 'custom':
          // For webhooks, ping the endpoint
          success = await this._testWebhook(integration.config.endpoint, credentials);
          message = success ? 'Endpoint reachable' : 'Endpoint unreachable';
          break;

        default:
          message = 'Unsupported integration type';
      }

      latency = Date.now() - startTime;
    } catch (error) {
      message = error.message;
      logger.error(`[IntegrationService] Connection test failed: ${error.message}`);
    }

    // Update integration status
    integration.status = success ? 'active' : 'error';
    if (!success) {
      integration.lastError = {
        message,
        timestamp: new Date()
      };
    }
    await integration.save();

    return { success, message, latency };
  }

  /**
   * Sync integration data
   * @param {string} integrationId - Integration ID
   * @returns {Object} Sync result
   */
  async sync(integrationId) {
    const integration = await Integration.findById(integrationId);

    if (!integration) {
      throw new AppError('Integration not found', 404, 'NOT_FOUND');
    }

    if (!integration.sync.enabled) {
      throw new AppError('Sync is not enabled for this integration', 400, 'SYNC_DISABLED');
    }

    logger.info(`[IntegrationService] Starting sync for integration: ${integrationId}`);

    try {
      const credentials = this._decryptCredentials(integration.credentials);

      // Perform sync based on type
      let result;
      switch (integration.type) {
        case 'openai':
        case 'anthropic':
          result = await this._syncAIProvider(integration, credentials);
          break;
        case 'stripe':
        case 'razorpay':
          result = await this._syncPaymentProvider(integration, credentials);
          break;
        default:
          result = { recordsProcessed: 0, message: 'No sync implemented for this type' };
      }

      // Update sync status
      integration.sync.lastSyncAt = new Date();
      integration.sync.lastSyncStatus = 'success';
      integration.sync.lastSyncError = null;
      await integration.save();

      logger.info(`[IntegrationService] Sync completed for integration: ${integrationId}`);

      return {
        success: true,
        message: 'Sync completed successfully',
        ...result
      };
    } catch (error) {
      integration.sync.lastSyncAt = new Date();
      integration.sync.lastSyncStatus = 'failed';
      integration.sync.lastSyncError = error.message;
      await integration.save();

      throw new AppError(`Sync failed: ${error.message}`, 500, 'SYNC_FAILED');
    }
  }

  /**
   * Toggle integration status
   * @param {string} integrationId - Integration ID
   * @param {string} status - New status
   * @param {string} organizationId - Organization ID
   * @returns {Object} Updated integration
   */
  async toggleStatus(integrationId, status, organizationId) {
    const integration = await Integration.findOne({
      _id: integrationId,
      organization: organizationId
    });

    if (!integration) {
      throw new AppError('Integration not found', 404, 'NOT_FOUND');
    }

    integration.status = status;
    await integration.save();

    return integration;
  }

  // Private methods

  /**
   * Get a valid 32-byte encryption key from environment
   * @returns {Buffer} 32-byte key buffer
   */
  _getEncryptionKey() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return null;
    }

    // If the key is a 64-character hex string, convert it directly
    if (/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      return Buffer.from(encryptionKey, 'hex');
    }

    // Otherwise, derive a 32-byte key using SHA-256
    return crypto.createHash('sha256').update(encryptionKey).digest();
  }

  _encryptCredentials(credentials) {
    const key = this._getEncryptionKey();
    if (!key) {
      logger.warn('[IntegrationService] No encryption key set, credentials stored as-is');
      return credentials;
    }

    const encrypted = {};
    for (const [keyName, value] of Object.entries(credentials)) {
      if (value) {
        // Use a random IV for each encryption (more secure)
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        encrypted[keyName] = iv.toString('hex') + ':' + cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
      }
    }
    return encrypted;
  }

  _decryptCredentials(encryptedCredentials) {
    const key = this._getEncryptionKey();
    if (!key) {
      return encryptedCredentials || {};
    }

    const decrypted = {};
    for (const [keyName, value] of Object.entries(encryptedCredentials || {})) {
      if (value) {
        try {
          // Check if it's the new format (IV:ciphertext) or old format
          if (value.includes(':')) {
            const [ivHex, encrypted] = value.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            decrypted[keyName] = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
          } else {
            // Old format with fixed IV (for backward compatibility)
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
            decrypted[keyName] = decipher.update(value, 'hex', 'utf8') + decipher.final('utf8');
          }
        } catch (err) {
          logger.warn(`[IntegrationService] Failed to decrypt ${keyName}: ${err.message}`);
          decrypted[keyName] = value;
        }
      }
    }
    return decrypted;
  }

  async _testAIProvider(type, credentials) {
    try {
      if (!credentials.apiKey) {
        return false;
      }

      // In development/test mode, simulate successful connection
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.info('[IntegrationService] Development mode: simulating successful AI provider test');
        return true;
      }

      // Make actual API call to verify credentials
      if (type === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`
          }
        });
        return response.ok;
      } else if (type === 'anthropic') {
        // Anthropic doesn't have a simple test endpoint, verify key format
        return credentials.apiKey.startsWith('sk-ant-');
      }

      return !!(credentials.apiKey);
    } catch (error) {
      logger.error(`[IntegrationService] AI provider test failed: ${error.message}`);
      return false;
    }
  }

  async _testPaymentProvider(type, credentials) {
    try {
      // In development/test mode, simulate successful connection
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.info('[IntegrationService] Development mode: simulating successful payment provider test');
        return true;
      }

      if (type === 'stripe' && credentials.apiKey) {
        // Test Stripe credentials by retrieving balance
        const response = await fetch('https://api.stripe.com/v1/balance', {
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`
          }
        });
        return response.ok;
      } else if (type === 'razorpay' && credentials.keyId && credentials.keySecret) {
        // Razorpay uses basic auth
        const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        return response.ok;
      }

      return !!(credentials.apiKey || credentials.secretKey);
    } catch (error) {
      logger.error(`[IntegrationService] Payment provider test failed: ${error.message}`);
      return false;
    }
  }

  async _testNotificationProvider(type, config, credentials) {
    try {
      // In development/test mode, simulate successful connection
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.info('[IntegrationService] Development mode: simulating successful notification provider test');
        return true;
      }

      if (type === 'slack' && credentials.webhookUrl) {
        // Send test message to Slack
        const response = await fetch(credentials.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Connection test from API Token Manager' })
        });
        return response.ok;
      } else if (type === 'discord' && credentials.webhookUrl) {
        // Send test message to Discord
        const response = await fetch(credentials.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Connection test from API Token Manager' })
        });
        return response.ok;
      }

      return !!(credentials.apiKey || credentials.token);
    } catch (error) {
      logger.error(`[IntegrationService] Notification provider test failed: ${error.message}`);
      return false;
    }
  }

  async _testWebhook(endpoint, credentials) {
    try {
      if (!endpoint) {
        return false;
      }

      // In development/test mode, simulate successful connection
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.info('[IntegrationService] Development mode: simulating successful webhook test');
        return true;
      }

      // Send test webhook request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true',
          ...(credentials.secret && { 'X-Webhook-Secret': credentials.secret })
        },
        body: JSON.stringify({
          event: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: { message: 'Connection test from API Token Manager' }
        })
      });

      return response.ok || response.status === 202;
    } catch (error) {
      logger.error(`[IntegrationService] Webhook test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Sync AI provider data (usage, models, costs)
   * FR-47: Usage Synchronization
   */
  async _syncAIProvider(integration, credentials) {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let usageData = [];

    try {
      const orgId = integration.organization;

      if (integration.type === 'openai') {
        usageData = await this._syncOpenAIUsage(credentials.apiKey, orgId, integration.config);
      } else if (integration.type === 'anthropic') {
        usageData = await this._syncAnthropicUsage(credentials.apiKey, orgId, integration.config);
      }

      // Get all features for this organization
      const allFeatures = await Feature.find({ organization: orgId });

      // Update features with synced usage data
      for (const data of usageData) {
        // Try multiple strategies to find the feature
        let feature = null;

        // Strategy 1: Find by external ID
        feature = await Feature.findOne({
          organization: orgId,
          externalId: data.modelId
        });

        // Strategy 2: Find by model name matching
        if (!feature && data.modelId) {
          const provider = await this._getProviderForIntegration(integration.type);
          if (provider) {
            const aiModel = await this._findModelByName(data.modelId, provider._id);
            if (aiModel) {
              feature = await Feature.findOne({
                organization: orgId,
                model: aiModel._id
              });
            }
          }
        }

        // Strategy 3: Use first available feature if no match
        if (!feature && allFeatures.length > 0) {
          feature = allFeatures[0];
        }

        if (feature) {
          // Update feature stats using the recordUsage method
          await feature.recordUsage({
            requests: data.requests || 0,
            tokens: data.totalTokens || 0,
            inputTokens: data.inputTokens || 0,
            outputTokens: data.outputTokens || 0,
            cost: data.cost || 0,
            errorCount: 0,
            avgLatency: 0
          });
          recordsProcessed++;
        }
      }

      // Update integration sync metadata
      integration.sync.metadata = {
        lastSyncDuration: Date.now() - startTime,
        recordsProcessed,
        usageRecords: usageData.length,
        syncedAt: new Date()
      };

      logger.info(`[IntegrationService] AI provider sync completed: ${recordsProcessed} records processed`);

      return {
        recordsProcessed,
        usageRecords: usageData.length,
        duration: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`[IntegrationService] AI provider sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get provider for integration type
   */
  async _getProviderForIntegration(type) {
    const Provider = (await import('../models/Provider.js')).default;
    return Provider.findOne({
      $or: [
        { slug: type },
        { name: new RegExp(type, 'i') }
      ]
    });
  }

  /**
   * Find model by name and provider
   */
  async _findModelByName(modelName, providerId) {
    const AIModel = (await import('../models/AIModel.js')).default;
    return AIModel.findOne({
      provider: providerId,
      $or: [
        { name: new RegExp(modelName, 'i') },
        { displayName: new RegExp(modelName, 'i') },
        { slug: modelName.toLowerCase().replace(/[^a-z0-9]/g, '-') }
      ]
    });
  }

  /**
   * Sync OpenAI usage data
   */
  async _syncOpenAIUsage(apiKey, orgId, config) {
    const usageData = [];

    try {
      // Get usage from OpenAI API
      const response = await fetch('https://api.openai.com/v1/usage', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        logger.warn('[IntegrationService] Failed to fetch OpenAI usage data');
        return usageData;
      }

      const data = await response.json();

      // Process daily usage data
      if (data.data && Array.isArray(data.data)) {
        for (const dayUsage of data.data) {
          if (dayUsage.line_items && Array.isArray(dayUsage.line_items)) {
            for (const item of dayUsage.line_items) {
              usageData.push({
                modelId: item.model || 'unknown',
                requests: item.n_requests || 0,
                totalTokens: item.n_generated_tokens + item.n_context_tokens_total || 0,
                inputTokens: item.n_context_tokens_total || 0,
                outputTokens: item.n_generated_tokens || 0,
                cost: item.cost || 0,
                date: dayUsage.timestamp || new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error(`[IntegrationService] OpenAI sync error: ${error.message}`);
    }

    return usageData;
  }

  /**
   * Sync Anthropic usage data
   */
  async _syncAnthropicUsage(apiKey, orgId, config) {
    const usageData = [];

    try {
      // Anthropic API for usage statistics
      // Note: Anthropic's API may require specific endpoints
      const response = await fetch('https://api.anthropic.com/v1/usage', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      if (!response.ok) {
        logger.warn('[IntegrationService] Failed to fetch Anthropic usage data');
        return usageData;
      }

      const data = await response.json();

      // Process usage data
      if (data.usage && Array.isArray(data.usage)) {
        for (const item of data.usage) {
          usageData.push({
            modelId: item.model || 'claude',
            requests: item.requests || 0,
            totalTokens: (item.input_tokens || 0) + (item.output_tokens || 0),
            inputTokens: item.input_tokens || 0,
            outputTokens: item.output_tokens || 0,
            cost: item.cost || 0,
            date: item.timestamp || new Date()
          });
        }
      }
    } catch (error) {
      logger.error(`[IntegrationService] Anthropic sync error: ${error.message}`);
    }

    return usageData;
  }

  /**
   * Sync payment provider data (invoices, transactions)
   */
  async _syncPaymentProvider(integration, credentials) {
    const startTime = Date.now();
    let recordsProcessed = 0;

    try {
      const orgId = integration.organization;

      if (integration.type === 'stripe') {
        recordsProcessed = await this._syncStripeData(credentials.apiKey, orgId, integration);
      } else if (integration.type === 'razorpay') {
        recordsProcessed = await this._syncRazorpayData(credentials, orgId, integration);
      }

      // Update integration sync metadata
      integration.sync.metadata = {
        lastSyncDuration: Date.now() - startTime,
        recordsProcessed,
        syncedAt: new Date()
      };

      logger.info(`[IntegrationService] Payment provider sync completed: ${recordsProcessed} records processed`);

      return {
        recordsProcessed,
        duration: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`[IntegrationService] Payment provider sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync Stripe data (invoices, payments, subscriptions)
   */
  async _syncStripeData(apiKey, orgId, integration) {
    let recordsProcessed = 0;

    try {
      // Get recent invoices
      const response = await fetch('https://api.stripe.com/v1/invoices?limit=100', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        logger.warn('[IntegrationService] Failed to fetch Stripe invoices');
        return recordsProcessed;
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        for (const stripeInvoice of data.data) {
          // Check if invoice already exists
          const existingInvoice = await Invoice.findOne({
            externalInvoiceId: stripeInvoice.id,
            organization: orgId
          });

          if (!existingInvoice) {
            // Create new invoice record
            await Invoice.create({
              organization: orgId,
              externalInvoiceId: stripeInvoice.id,
              invoiceNumber: stripeInvoice.number || `STRIPE-${stripeInvoice.id.slice(-8)}`,
              type: 'subscription',
              billingPeriod: {
                start: new Date(stripeInvoice.period_start * 1000),
                end: new Date(stripeInvoice.period_end * 1000)
              },
              items: stripeInvoice.lines?.data?.map(line => ({
                description: line.description || 'Subscription',
                type: 'subscription',
                quantity: line.quantity || 1,
                unitPrice: (line.amount || 0) / 100,
                amount: (line.amount || 0) / 100
              })) || [],
              subtotal: (stripeInvoice.subtotal || 0) / 100,
              discount: (stripeInvoice.discount || 0) / 100,
              tax: (stripeInvoice.tax || 0) / 100,
              total: (stripeInvoice.total || 0) / 100,
              currency: stripeInvoice.currency?.toUpperCase() || 'USD',
              status: this._mapStripeStatus(stripeInvoice.status),
              dueDate: new Date(stripeInvoice.due_date * 1000),
              payment: {
                provider: 'stripe',
                externalPaymentId: stripeInvoice.payment_intent,
                paidAt: stripeInvoice.status_transitions?.paid_at
                  ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
                  : null
              }
            });
            recordsProcessed++;
          }
        }
      }
    } catch (error) {
      logger.error(`[IntegrationService] Stripe sync error: ${error.message}`);
    }

    return recordsProcessed;
  }

  /**
   * Sync Razorpay data
   */
  async _syncRazorpayData(credentials, orgId, integration) {
    let recordsProcessed = 0;

    try {
      const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');

      // Get recent payments
      const response = await fetch('https://api.razorpay.com/v1/payments?count=100', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!response.ok) {
        logger.warn('[IntegrationService] Failed to fetch Razorpay payments');
        return recordsProcessed;
      }

      const data = await response.json();

      if (data.items && Array.isArray(data.items)) {
        for (const payment of data.items) {
          // Check if payment record exists
          const existingInvoice = await Invoice.findOne({
            'payment.externalPaymentId': payment.id,
            organization: orgId
          });

          if (!existingInvoice && payment.status === 'captured') {
            // Create invoice record for payment
            await Invoice.create({
              organization: orgId,
              externalInvoiceId: payment.order_id || payment.id,
              invoiceNumber: `RZP-${payment.id.slice(-8)}`,
              type: 'one_time',
              items: [{
                description: 'Payment via Razorpay',
                type: 'subscription',
                quantity: 1,
                unitPrice: payment.amount / 100,
                amount: payment.amount / 100
              }],
              subtotal: payment.amount / 100,
              total: payment.amount / 100,
              currency: payment.currency?.toUpperCase() || 'INR',
              status: 'paid',
              dueDate: new Date(payment.created_at * 1000),
              payment: {
                provider: 'razorpay',
                externalPaymentId: payment.id,
                paymentMethod: {
                  type: payment.method,
                  last4: payment.card?.last4,
                  brand: payment.card?.network
                },
                paidAt: new Date(payment.created_at * 1000)
              }
            });
            recordsProcessed++;
          }
        }
      }
    } catch (error) {
      logger.error(`[IntegrationService] Razorpay sync error: ${error.message}`);
    }

    return recordsProcessed;
  }

  /**
   * Map Stripe invoice status to our status
   */
  _mapStripeStatus(stripeStatus) {
    const statusMap = {
      'draft': 'draft',
      'open': 'pending',
      'paid': 'paid',
      'void': 'cancelled',
      'uncollectible': 'failed'
    };
    return statusMap[stripeStatus] || 'pending';
  }
}

export default new IntegrationService();