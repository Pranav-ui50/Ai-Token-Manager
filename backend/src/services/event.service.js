/**
 * Event Service
 *
 * Central event emitter for triggering webhooks and other event-driven actions.
 * FR-49: Pricing change notifications
 * FR-50: Low margin alerts
 * FR-51: Usage spike alerts
 */

import webhookService from './webhook.service.js';
import logger from '../config/logger.js';

class EventService {
  constructor() {
    this.listeners = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the event service
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('[EventService] Event service initialized');
  }

  /**
   * Emit an event and trigger webhooks
   * @param {string} organizationId - Organization ID
   * @param {string} event - Event name
   * @param {Object} data - Event payload
   * @returns {Promise<void>}
   */
  async emit(organizationId, event, data) {
    logger.info(`[EventService] Emitting event: ${event} for organization: ${organizationId}`);

    // Trigger webhooks for this event
    try {
      await webhookService.triggerWebhooks(organizationId, event, data);
    } catch (error) {
      // Log but don't fail - webhooks are async and shouldn't block
      logger.error(`[EventService] Webhook trigger failed for ${event}: ${error.message}`);
    }

    // Call any registered listeners
    const eventListeners = this.listeners.get(event) || [];
    for (const listener of eventListeners) {
      try {
        await listener(organizationId, data);
      } catch (error) {
        logger.error(`[EventService] Listener failed for ${event}: ${error.message}`);
      }
    }
  }

  /**
   * Register a listener for specific events
   * @param {string} event - Event name
   * @param {Function} listener - Listener function
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  /**
   * Remove a listener
   * @param {string} event - Event name
   * @param {Function} listener - Listener function
   */
  off(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // ============================================
  // HELPER METHODS FOR COMMON EVENTS
  // ============================================

  /**
   * Emit provider pricing change event
   * FR-49: Notify users about pricing changes
   * @param {string} organizationId - Organization ID
   * @param {Object} provider - Provider data
   * @param {Object} changes - Pricing changes
   */
  async emitProviderPricingChanged(organizationId, provider, changes) {
    await this.emit(organizationId, 'provider.pricing.updated', {
      provider: {
        id: provider._id,
        name: provider.name,
        displayName: provider.displayName
      },
      changes,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit model pricing change event
   * FR-49: Notify users about model pricing changes
   * @param {string} organizationId - Organization ID
   * @param {Object} model - Model data
   * @param {Object} oldPricing - Previous pricing
   * @param {Object} newPricing - New pricing
   */
  async emitModelPricingChanged(organizationId, model, oldPricing, newPricing) {
    await this.emit(organizationId, 'model.pricing.updated', {
      model: {
        id: model._id,
        name: model.name,
        displayName: model.displayName
      },
      provider: model.provider,
      oldPricing,
      newPricing,
      priceChange: {
        inputDiff: (newPricing.inputPrice || 0) - (oldPricing.inputPrice || 0),
        outputDiff: (newPricing.outputPrice || 0) - (oldPricing.outputPrice || 0)
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit feature created event
   * @param {string} organizationId - Organization ID
   * @param {Object} feature - Feature data
   */
  async emitFeatureCreated(organizationId, feature) {
    await this.emit(organizationId, 'feature.created', {
      feature: {
        id: feature._id,
        name: feature.name,
        category: feature.category,
        status: feature.status
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit feature updated event
   * @param {string} organizationId - Organization ID
   * @param {Object} feature - Feature data
   * @param {Object} changes - What changed
   */
  async emitFeatureUpdated(organizationId, feature, changes) {
    await this.emit(organizationId, 'feature.updated', {
      feature: {
        id: feature._id,
        name: feature.name,
        category: feature.category
      },
      changes,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit low margin alert
   * FR-50: Notify users about low margins
   * @param {string} organizationId - Organization ID
   * @param {Object} marginData - Margin data
   */
  async emitLowMarginAlert(organizationId, marginData) {
    await this.emit(organizationId, 'alert.margin.low', {
      alert: {
        type: 'low_margin',
        severity: marginData.margin < 0 ? 'critical' : 'warning',
        message: marginData.margin < 0
          ? `Negative margin detected: ${marginData.margin}%`
          : `Low margin warning: ${marginData.margin}%`,
        threshold: marginData.threshold || 10,
        currentMargin: marginData.margin,
        feature: marginData.feature
      },
      data: marginData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit usage spike alert
   * FR-51: Notify users about unusual usage spikes
   * @param {string} organizationId - Organization ID
   * @param {Object} spikeData - Spike data
   */
  async emitUsageSpikeAlert(organizationId, spikeData) {
    await this.emit(organizationId, 'alert.usage.spike', {
      alert: {
        type: 'usage_spike',
        severity: spikeData.increasePercent > 200 ? 'critical' : 'warning',
        message: `Usage spike detected: ${spikeData.increasePercent}% increase`,
        baseline: spikeData.baseline,
        current: spikeData.current,
        increasePercent: spikeData.increasePercent,
        feature: spikeData.feature,
        model: spikeData.model
      },
      data: spikeData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit subscription event
   * @param {string} organizationId - Organization ID
   * @param {string} eventType - Event type (created, updated, cancelled, expired)
   * @param {Object} subscription - Subscription data
   */
  async emitSubscriptionEvent(organizationId, eventType, subscription) {
    await this.emit(organizationId, `subscription.${eventType}`, {
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      },
      eventType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit billing event
   * @param {string} organizationId - Organization ID
   * @param {string} eventType - Event type (invoice_created, payment_success, payment_failed)
   * @param {Object} invoice - Invoice data
   */
  async emitBillingEvent(organizationId, eventType, invoice) {
    await this.emit(organizationId, `billing.${eventType}`, {
      invoice: {
        id: invoice._id,
        number: invoice.invoiceNumber,
        amount: invoice.total,
        currency: invoice.currency,
        status: invoice.status
      },
      eventType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit integration sync event
   * @param {string} organizationId - Organization ID
   * @param {string} integrationType - Integration type
   * @param {string} status - Sync status
   * @param {Object} result - Sync result
   */
  async emitIntegrationSyncEvent(organizationId, integrationType, status, result) {
    await this.emit(organizationId, `integration.${integrationType}.sync.${status}`, {
      integration: {
        type: integrationType
      },
      status,
      result: {
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsFailed: result.recordsFailed,
        duration: result.duration
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit plan limit warning
   * @param {string} organizationId - Organization ID
   * @param {Object} limitData - Limit data
   */
  async emitPlanLimitWarning(organizationId, limitData) {
    await this.emit(organizationId, 'alert.plan_limit', {
      alert: {
        type: 'plan_limit',
        severity: limitData.percentUsed >= 90 ? 'critical' : 'warning',
        message: `Plan limit reached: ${limitData.percentUsed}% of ${limitData.limitType} used`,
        limitType: limitData.limitType,
        currentUsage: limitData.currentUsage,
        limit: limitData.limit,
        percentUsed: limitData.percentUsed
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
const eventService = new EventService();
export default eventService;