/**
 * Webhook Service
 *
 * Handles all webhook-related business logic.
 * FR-46: Webhook Configurations
 */

import Webhook from '../models/Webhook.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class WebhookService {
  /**
   * Create a new webhook
   * @param {Object} data - Webhook data
   * @param {string} userId - User ID
   * @returns {Object} Created webhook
   */
  async create(data, userId) {
    const { organizationId, name, url, events, config } = data;

    logger.info(`[WebhookService] Creating webhook: ${name} for organization: ${organizationId}`);

    // Validate events
    if (!events || events.length === 0) {
      throw new AppError('At least one event must be selected', 400, 'VALIDATION_ERROR');
    }

    // Generate secret key for signature verification
    const secretKey = crypto.randomBytes(32).toString('hex');

    // Create webhook
    const webhook = await Webhook.create({
      organization: organizationId,
      name,
      url,
      events,
      ...config,
      secretKey,
      createdBy: userId
    });

    await webhook.populate('createdBy', 'firstName lastName email');

    logger.info(`[WebhookService] Webhook created: ${webhook._id}`);

    return {
      ...webhook.toObject(),
      secretKey // Return secret key only on creation
    };
  }

  /**
   * Get webhook by ID
   * @param {string} webhookId - Webhook ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Webhook
   */
  async getById(webhookId, organizationId) {
    const webhook = await Webhook.findOne({
      _id: webhookId,
      organization: organizationId
    }).populate('createdBy', 'firstName lastName email');

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    return webhook;
  }

  /**
   * Get all webhooks for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Webhooks with pagination
   */
  async getForOrganization(organizationId, filters = {}) {
    const { status, event, page = 1, limit = 10 } = filters;

    const query = { organization: organizationId };

    if (status) {
      query.status = status;
    }

    if (event) {
      query.events = event;
    }

    const skip = (page - 1) * limit;

    const webhooks = await Webhook.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Webhook.countDocuments(query);

    return {
      webhooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Updated webhook
   */
  async update(webhookId, data, organizationId, userId) {
    const webhook = await Webhook.findOne({
      _id: webhookId,
      organization: organizationId
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'url', 'events', 'headers', 'auth', 'retry', 'timeout', 'filters'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        webhook[field] = data[field];
      }
    });

    webhook.lastModifiedBy = userId;
    await webhook.save();

    await webhook.populate('createdBy', 'firstName lastName email');
    await webhook.populate('lastModifiedBy', 'firstName lastName email');

    logger.info(`[WebhookService] Webhook updated: ${webhookId}`);

    return webhook;
  }

  /**
   * Delete webhook
   * @param {string} webhookId - Webhook ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Success message
   */
  async delete(webhookId, organizationId) {
    const webhook = await Webhook.findOneAndDelete({
      _id: webhookId,
      organization: organizationId
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    logger.info(`[WebhookService] Webhook deleted: ${webhookId}`);

    return { message: 'Webhook deleted successfully' };
  }

  /**
   * Toggle webhook status
   * @param {string} webhookId - Webhook ID
   * @param {string} status - New status
   * @param {string} organizationId - Organization ID
   * @returns {Object} Updated webhook
   */
  async toggleStatus(webhookId, status, organizationId) {
    const webhook = await Webhook.findOne({
      _id: webhookId,
      organization: organizationId
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    webhook.status = status;
    await webhook.save();

    logger.info(`[WebhookService] Webhook status updated: ${webhookId} to ${status}`);

    return webhook;
  }

  /**
   * Test webhook
   * @param {string} webhookId - Webhook ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} Test result
   */
  async test(webhookId, organizationId) {
    const webhook = await Webhook.findOne({
      _id: webhookId,
      organization: organizationId
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook',
        webhookId: webhook._id.toString()
      }
    };

    const result = await this._deliverWebhook(webhook, testPayload, 'webhook.test');

    return {
      success: result.success,
      statusCode: result.statusCode,
      duration: result.duration,
      message: result.success ? 'Webhook delivered successfully' : result.error
    };
  }

  /**
   * Regenerate webhook secret
   * @param {string} webhookId - Webhook ID
   * @param {string} organizationId - Organization ID
   * @returns {Object} New secret key
   */
  async regenerateSecret(webhookId, organizationId) {
    const webhook = await Webhook.findOne({
      _id: webhookId,
      organization: organizationId
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    const newSecret = crypto.randomBytes(32).toString('hex');
    webhook.secretKey = newSecret;
    await webhook.save();

    logger.info(`[WebhookService] Webhook secret regenerated: ${webhookId}`);

    return {
      secretKey: newSecret
    };
  }

  /**
   * Get webhooks for an event
   * @param {string} organizationId - Organization ID
   * @param {string} event - Event name
   * @returns {Array} Webhooks
   */
  async getWebhooksForEvent(organizationId, event) {
    return Webhook.findForEvent(organizationId, event);
  }

  /**
   * Trigger webhooks for an event
   * @param {string} organizationId - Organization ID
   * @param {string} event - Event name
   * @param {Object} payload - Event payload
   */
  async triggerWebhooks(organizationId, event, payload) {
    const webhooks = await this.getWebhooksForEvent(organizationId, event);

    if (webhooks.length === 0) {
      logger.debug(`[WebhookService] No webhooks configured for event: ${event}`);
      return;
    }

    logger.info(`[WebhookService] Triggering ${webhooks.length} webhooks for event: ${event}`);

    // Deliver webhooks in parallel (fire and forget)
    for (const webhook of webhooks) {
      this._deliverWebhook(webhook, payload, event).catch(err => {
        logger.error(`[WebhookService] Webhook delivery failed: ${webhook._id}`, err);
      });
    }
  }

  /**
   * Get delivery history for webhook
   * @param {string} webhookId - Webhook ID
   * @param {string} organizationId - Organization ID
   * @returns {Array} Delivery history
   */
  async getDeliveryHistory(webhookId, organizationId) {
    const webhook = await Webhook.findOne({
      _id: webhookId,
      organization: organizationId
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

    return webhook.recentDeliveries;
  }

  // Private methods

  /**
   * Deliver webhook
   * @param {Object} webhook - Webhook document
   * @param {Object} payload - Payload to send
   * @param {string} event - Event name
   * @returns {Object} Delivery result
   */
  async _deliverWebhook(webhook, payload, event) {
    const startTime = Date.now();
    let success = false;
    let statusCode = null;
    let error = null;

    try {
      // Prepare request
      const url = webhook.url;
      const method = webhook.method || 'POST';
      const headers = {
        'Content-Type': 'application/json',
        ...Object.fromEntries(webhook.headers || [])
      };

      // Add signature if secret is set
      if (webhook.secretKey) {
        const signature = this._generateSignature(webhook.secretKey, payload);
        headers['X-Webhook-Signature'] = signature;
      }

      // Add auth headers if configured
      if (webhook.auth && webhook.auth.type !== 'none') {
        switch (webhook.auth.type) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${webhook.auth.token}`;
            break;
          case 'basic':
            const basic = Buffer.from(`${webhook.auth.username}:${webhook.auth.password}`).toString('base64');
            headers['Authorization'] = `Basic ${basic}`;
            break;
          case 'api_key':
            headers[webhook.auth.apiKeyHeader] = webhook.auth.apiKeyValue;
            break;
        }
      }

      // Add event metadata
      const body = JSON.stringify({
        id: crypto.randomBytes(16).toString('hex'),
        event,
        timestamp: new Date().toISOString(),
        data: payload
      });

      // In production, use fetch or axios
      // For now, simulate successful delivery
      // const response = await fetch(url, { method, headers, body, timeout: webhook.timeout });
      // statusCode = response.status;
      // success = response.ok;

      // Simulated response for development
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network latency
      statusCode = 200;
      success = true;

      logger.info(`[WebhookService] Webhook delivered: ${webhook._id} to ${url}`);

    } catch (err) {
      error = err.message;
      statusCode = err.statusCode || 500;
      logger.error(`[WebhookService] Webhook delivery failed: ${webhook._id}`, err);
    }

    const duration = Date.now() - startTime;

    // Update stats
    await webhook.updateStats(success, duration, statusCode, error);

    // Add delivery record
    await webhook.addDeliveryRecord({
      eventId: crypto.randomBytes(16).toString('hex'),
      event,
      statusCode,
      duration,
      success,
      error
    });

    return { success, statusCode, duration, error };
  }

  /**
   * Generate HMAC signature
   * @param {string} secret - Secret key
   * @param {Object} payload - Payload to sign
   * @returns {string} Signature
   */
  _generateSignature(secret, payload) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   * @param {string} secret - Secret key
   * @param {Object} payload - Payload to verify
   * @param {string} signature - Signature to verify
   * @returns {boolean} Is valid
   */
  verifySignature(secret, payload, signature) {
    if (!signature || !signature.startsWith('sha256=')) {
      return false;
    }

    const expected = this._generateSignature(secret, payload);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

export default new WebhookService();