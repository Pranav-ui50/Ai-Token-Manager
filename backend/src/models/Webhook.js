/**
 * Webhook Model
 *
 * MongoDB model for webhook configurations.
 * FR-46: Webhook Configurations
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const WEBHOOK_EVENTS = [
  // Provider events
  'provider.created',
  'provider.updated',
  'provider.deleted',

  // Model events
  'model.created',
  'model.updated',
  'model.deleted',

  // Feature events
  'feature.created',
  'feature.updated',
  'feature.deleted',

  // Plan events
  'plan.created',
  'plan.updated',
  'plan.deleted',

  // Project events
  'project.created',
  'project.updated',
  'project.deleted',

  // Pricing events
  'pricing.changed',
  'pricing.alert',

  // Simulation events
  'simulation.started',
  'simulation.completed',
  'simulation.failed',

  // Analytics events
  'analytics.threshold_reached',
  'analytics.cost_spike',

  // Integration events
  'integration.connected',
  'integration.disconnected',
  'integration.error',

  // User events
  'user.registered',
  'user.invited',

  // Organization events
  'organization.created',
  'organization.updated'
];

const WEBHOOK_STATUS = ['active', 'inactive', 'failing', 'disabled'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH'];

const webhookSchema = new mongoose.Schema(
  {
    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },

    // Integration reference (optional - can be standalone webhook)
    integration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Integration',
      default: null
    },

    // Webhook identification
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
      maxlength: [100, 'Webhook name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Webhook configuration
    url: {
      type: String,
      required: [true, 'Webhook URL is required'],
      trim: true,
      validate: {
        validator: function (v) {
          try {
            const url = new URL(v);
            return url.protocol === 'https:' || url.protocol === 'http:';
          } catch {
            return false;
          }
        },
        message: 'Invalid webhook URL'
      }
    },

    // HTTP method
    method: {
      type: String,
      enum: HTTP_METHODS,
      default: 'POST'
    },

    // Events to trigger on
    events: [{
      type: String,
      enum: WEBHOOK_EVENTS,
      required: true
    }],

    // Filter conditions (optional)
    filters: {
      // Only trigger for specific resources
      resourceIds: [{
        type: mongoose.Schema.Types.ObjectId
      }],
      // Only trigger for specific conditions
      conditions: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },

    // Request configuration
    headers: {
      type: Map,
      of: String,
      default: {}
    },

    // Authentication
    auth: {
      type: {
        type: String,
        enum: ['none', 'basic', 'bearer', 'hmac', 'api_key'],
        default: 'none'
      },
      // For basic auth
      username: {
        type: String,
        select: false
      },
      password: {
        type: String,
        select: false
      },
      // For bearer/auth token
      token: {
        type: String,
        select: false
      },
      // For HMAC
      secret: {
        type: String,
        select: false
      },
      // For API key
      apiKeyHeader: {
        type: String,
        default: 'X-API-Key'
      },
      apiKeyValue: {
        type: String,
        select: false
      }
    },

    // Secret for signature verification
    secretKey: {
      type: String,
      select: false
    },

    // Retry configuration
    retry: {
      enabled: {
        type: Boolean,
        default: true
      },
      maxAttempts: {
        type: Number,
        default: 3,
        min: 1,
        max: 10
      },
      backoffMultiplier: {
        type: Number,
        default: 2
      },
      initialDelayMs: {
        type: Number,
        default: 1000
      }
    },

    // Timeout in milliseconds
    timeout: {
      type: Number,
      default: 30000,
      min: [1000, 'Timeout must be at least 1000ms'],
      max: [60000, 'Timeout cannot exceed 60000ms']
    },

    // Status
    status: {
      type: String,
      enum: WEBHOOK_STATUS,
      default: 'active'
    },

    // Delivery statistics
    stats: {
      totalDelivered: {
        type: Number,
        default: 0
      },
      totalFailed: {
        type: Number,
        default: 0
      },
      lastDeliveredAt: {
        type: Date,
        default: null
      },
      lastFailedAt: {
        type: Date,
        default: null
      },
      successRate: {
        type: Number,
        default: 100
      }
    },

    // Last error
    lastError: {
      message: String,
      code: String,
      statusCode: Number,
      timestamp: Date
    },

    // Recent delivery attempts (for debugging)
    recentDeliveries: [{
      eventId: String,
      event: String,
      timestamp: Date,
      statusCode: Number,
      duration: Number,
      success: Boolean,
      error: String
    }],

    // Metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.secretKey;
        delete ret.auth;
        return ret;
      }
    }
  }
);

// Indexes
webhookSchema.index({ organization: 1, status: 1 });
webhookSchema.index({ organization: 1, events: 1 });
webhookSchema.index({ integration: 1 });

// Static method to find by organization
webhookSchema.statics.findByOrganization = function (organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .sort({ createdAt: -1 });
};

// Static method to find active webhooks for an event
webhookSchema.statics.findForEvent = function (organizationId, event) {
  return this.find({
    organization: organizationId,
    status: 'active',
    events: event
  });
};

// Method to update stats after delivery
webhookSchema.methods.updateStats = async function (success, duration = 0, statusCode = 200, error = null) {
  if (success) {
    this.stats.totalDelivered += 1;
    this.stats.lastDeliveredAt = new Date();
    this.lastError = undefined;
  } else {
    this.stats.totalFailed += 1;
    this.stats.lastFailedAt = new Date();
    this.lastError = {
      message: error?.message || 'Unknown error',
      code: error?.code,
      statusCode: statusCode,
      timestamp: new Date()
    };

    // Auto-disable after too many failures
    if (this.stats.totalFailed >= 10 && this.stats.successRate < 50) {
      this.status = 'failing';
    }
  }

  // Calculate success rate
  const total = this.stats.totalDelivered + this.stats.totalFailed;
  if (total > 0) {
    this.stats.successRate = (this.stats.totalDelivered / total) * 100;
  }

  await this.save();
};

// Method to add delivery record
webhookSchema.methods.addDeliveryRecord = async function (delivery) {
  // Keep only last 20 deliveries
  this.recentDeliveries.unshift({
    eventId: delivery.eventId,
    event: delivery.event,
    timestamp: new Date(),
    statusCode: delivery.statusCode,
    duration: delivery.duration,
    success: delivery.success,
    error: delivery.error
  });

  if (this.recentDeliveries.length > 20) {
    this.recentDeliveries = this.recentDeliveries.slice(0, 20);
  }

  await this.save();
};

// Method to generate signature
webhookSchema.methods.generateSignature = function (payload) {
  if (!this.secretKey) {
    return null;
  }

  const hmac = crypto.createHmac('sha256', this.secretKey);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest('hex')}`;
};

// Method to test webhook
webhookSchema.methods.testConnection = async function () {
  // Will be implemented in service layer
  return { success: true, message: 'Webhook test not implemented' };
};

const Webhook = mongoose.model('Webhook', webhookSchema);

export default Webhook;