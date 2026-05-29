/**
 * Integration Model
 *
 * MongoDB model for third-party integrations.
 * FR-45: API Integrations
 */

import mongoose from 'mongoose';

const INTEGRATION_TYPES = [
  'openai',        // OpenAI API integration
  'anthropic',     // Anthropic Claude API
  'stripe',        // Stripe payment integration
  'razorpay',      // Razorpay payment integration
  'slack',         // Slack notifications
  'discord',       // Discord notifications
  'webhook',       // Generic webhook integration
  'custom'         // Custom integration
];

const INTEGRATION_STATUS = ['active', 'inactive', 'error', 'pending'];

const integrationSchema = new mongoose.Schema(
  {
    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },

    // Integration identification
    name: {
      type: String,
      required: [true, 'Integration name is required'],
      trim: true,
      maxlength: [100, 'Integration name cannot exceed 100 characters']
    },
    type: {
      type: String,
      enum: INTEGRATION_TYPES,
      required: [true, 'Integration type is required']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Configuration
    config: {
      // API endpoint URL
      endpoint: {
        type: String,
        trim: true
      },
      // Authentication type
      authType: {
        type: String,
        enum: ['none', 'api_key', 'oauth2', 'basic', 'bearer'],
        default: 'api_key'
      },
      // Headers to send with requests
      headers: {
        type: Map,
        of: String,
        default: {}
      },
      // Request timeout in milliseconds
      timeout: {
        type: Number,
        default: 30000,
        min: [1000, 'Timeout must be at least 1000ms'],
        max: [300000, 'Timeout cannot exceed 300000ms']
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
        backoffMs: {
          type: Number,
          default: 1000
        }
      }
    },

    // Credentials (encrypted)
    credentials: {
      apiKey: {
        type: String,
        select: false // Don't return by default
      },
      apiSecret: {
        type: String,
        select: false
      },
      accessToken: {
        type: String,
        select: false
      },
      refreshToken: {
        type: String,
        select: false
      },
      oauthClientId: {
        type: String,
        select: false
      },
      oauthClientSecret: {
        type: String,
        select: false
      },
      username: {
        type: String,
        select: false
      },
      password: {
        type: String,
        select: false
      }
    },

    // Sync settings
    sync: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number,
        default: 3600000, // 1 hour in milliseconds
        min: [300000, 'Sync interval must be at least 5 minutes']
      },
      lastSyncAt: {
        type: Date,
        default: null
      },
      lastSyncStatus: {
        type: String,
        enum: ['success', 'failed', 'pending', null],
        default: null
      },
      lastSyncError: {
        type: String,
        default: null
      }
    },

    // Webhook settings
    webhooks: [{
      event: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      active: {
        type: Boolean,
        default: true
      }
    }],

    // Status
    status: {
      type: String,
      enum: INTEGRATION_STATUS,
      default: 'pending'
    },
    lastError: {
      message: String,
      code: String,
      timestamp: Date
    },

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
        // Never return credentials in JSON
        delete ret.credentials;
        return ret;
      }
    }
  }
);

// Indexes
integrationSchema.index({ organization: 1, type: 1 });
integrationSchema.index({ organization: 1, status: 1 });
integrationSchema.index({ organization: 1, name: 1 }, { unique: true });

// Virtual for webhook count
integrationSchema.virtual('webhookCount', {
  ref: 'Webhook',
  localField: '_id',
  foreignField: 'integration',
  count: true
});

// Static method to find by organization
integrationSchema.statics.findByOrganization = function (organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .sort({ createdAt: -1 });
};

// Static method to find active integrations
integrationSchema.statics.findActive = function (organizationId) {
  return this.find({
    organization: organizationId,
    status: 'active'
  });
};

// Method to test connection
integrationSchema.methods.testConnection = async function () {
  // This will be implemented in the service layer
  // Returns { success: boolean, message: string, latency?: number }
  return { success: true, message: 'Connection test not implemented' };
};

// Method to mask sensitive data
integrationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.credentials;
  return obj;
};

const Integration = mongoose.model('Integration', integrationSchema);

export default Integration;