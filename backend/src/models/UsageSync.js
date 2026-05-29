/**
 * Usage Sync Model
 *
 * MongoDB model for tracking usage synchronization history.
 * FR-47: Usage Synchronization
 */

import mongoose from 'mongoose';

const SYNC_STATUS = ['pending', 'running', 'completed', 'failed', 'partial'];
const SYNC_TYPE = ['manual', 'scheduled', 'webhook'];

const usageSyncSchema = new mongoose.Schema(
  {
    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },

    // Integration reference
    integration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Integration',
      required: [true, 'Integration is required'],
      index: true
    },

    // Sync identification
    syncId: {
      type: String,
      unique: true,
      default: () => `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },

    // Sync type
    type: {
      type: String,
      enum: SYNC_TYPE,
      default: 'manual'
    },

    // Sync trigger
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Status
    status: {
      type: String,
      enum: SYNC_STATUS,
      default: 'pending',
      index: true
    },

    // Timing
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // in milliseconds
      default: null
    },

    // Data source info
    source: {
      provider: {
        type: String,
        required: true
      },
      integrationType: {
        type: String,
        enum: ['openai', 'anthropic', 'stripe', 'razorpay', 'custom'],
        required: true
      },
      endpoint: String
    },

    // Sync statistics
    stats: {
      recordsFetched: {
        type: Number,
        default: 0
      },
      recordsProcessed: {
        type: Number,
        default: 0
      },
      recordsCreated: {
        type: Number,
        default: 0
      },
      recordsUpdated: {
        type: Number,
        default: 0
      },
      recordsSkipped: {
        type: Number,
        default: 0
      },
      recordsFailed: {
        type: Number,
        default: 0
      }
    },

    // Usage summary
    usageSummary: {
      totalRequests: {
        type: Number,
        default: 0
      },
      totalTokens: {
        type: Number,
        default: 0
      },
      inputTokens: {
        type: Number,
        default: 0
      },
      outputTokens: {
        type: Number,
        default: 0
      },
      totalCost: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      },
      period: {
        start: Date,
        end: Date
      }
    },

    // Model breakdown
    modelBreakdown: [{
      modelId: String,
      modelName: String,
      requests: Number,
      inputTokens: Number,
      outputTokens: Number,
      cost: Number
    }],

    // Errors
    errors: [{
      code: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: mongoose.Schema.Types.Mixed
    }],

    // Warnings (non-fatal issues)
    warnings: [{
      code: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],

    // Raw data reference (for debugging)
    rawDataRef: {
      type: String, // Reference to stored raw data
      default: null
    },

    // Metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
usageSyncSchema.index({ organization: 1, integration: 1, createdAt: -1 });
usageSyncSchema.index({ organization: 1, status: 1, createdAt: -1 });
usageSyncSchema.index({ integration: 1, status: 1 });
usageSyncSchema.index({ 'source.provider': 1, createdAt: -1 });
usageSyncSchema.index({ syncId: 1 }, { unique: true });

// Virtual for duration in seconds
usageSyncSchema.virtual('durationSeconds').get(function() {
  return this.duration ? (this.duration / 1000).toFixed(2) : null;
});

// Virtual for success rate
usageSyncSchema.virtual('successRate').get(function() {
  const total = this.stats.recordsProcessed;
  if (total === 0) return 0;
  const successful = this.stats.recordsCreated + this.stats.recordsUpdated;
  return ((successful / total) * 100).toFixed(2);
});

// Static method to find by organization
usageSyncSchema.statics.findByOrganization = function(organizationId, filters = {}) {
  const query = { organization: organizationId };

  if (filters.status) query.status = filters.status;
  if (filters.integration) query.integration = filters.integration;
  if (filters.type) query.type = filters.type;
  if (filters.provider) query['source.provider'] = filters.provider;

  return this.find(query)
    .populate('integration', 'name type status')
    .populate('triggeredBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to find recent syncs
usageSyncSchema.statics.findRecent = function(organizationId, limit = 10) {
  return this.find({ organization: organizationId })
    .populate('integration', 'name type status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get sync statistics
usageSyncSchema.statics.getSyncStats = async function(organizationId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        organization: mongoose.Types.ObjectId.createFromHexString(organizationId),
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: {
          status: '$status',
          provider: '$source.provider'
        },
        count: { $sum: 1 },
        totalRecords: { $sum: '$stats.recordsProcessed' },
        totalCost: { $sum: '$usageSummary.totalCost' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $group: {
        _id: '$_id.provider',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count',
            records: '$totalRecords',
            cost: '$totalCost',
            avgDuration: '$avgDuration'
          }
        },
        totalSyncs: { $sum: '$count' },
        totalRecords: { $sum: '$totalRecords' },
        totalCost: { $sum: '$totalCost' }
      }
    }
  ]);

  return stats;
};

// Static method to get last successful sync
usageSyncSchema.statics.findLastSuccessful = function(integrationId) {
  return this.findOne({
    integration: integrationId,
    status: 'completed'
  }).sort({ createdAt: -1 });
};

// Static method to get pending syncs
usageSyncSchema.statics.findPending = function(organizationId) {
  return this.find({
    organization: organizationId,
    status: 'pending'
  }).sort({ createdAt: 1 });
};

// Instance method to mark as running
usageSyncSchema.methods.markRunning = async function() {
  this.status = 'running';
  this.startedAt = new Date();
  return this.save();
};

// Instance method to mark as completed
usageSyncSchema.methods.markCompleted = async function(stats = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.startedAt = this.startedAt || this.completedAt;
  this.duration = this.completedAt - this.startedAt;

  if (stats) {
    this.stats = { ...this.stats, ...stats.stats };
    this.usageSummary = { ...this.usageSummary, ...stats.usageSummary };
    if (stats.modelBreakdown) {
      this.modelBreakdown = stats.modelBreakdown;
    }
  }

  return this.save();
};

// Instance method to mark as failed
usageSyncSchema.methods.markFailed = async function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  if (this.startedAt) {
    this.duration = this.completedAt - this.startedAt;
  }

  this.errors.push({
    code: error.code || 'SYNC_ERROR',
    message: error.message,
    timestamp: new Date(),
    details: error.details || null
  });

  return this.save();
};

// Instance method to mark as partial
usageSyncSchema.methods.markPartial = async function(stats, warnings = []) {
  this.status = 'partial';
  this.completedAt = new Date();
  if (this.startedAt) {
    this.duration = this.completedAt - this.startedAt;
  }

  if (stats) {
    this.stats = { ...this.stats, ...stats.stats };
    this.usageSummary = { ...this.usageSummary, ...stats.usageSummary };
  }

  if (warnings && warnings.length > 0) {
    this.warnings = warnings.map(w => ({
      code: w.code || 'WARNING',
      message: w.message,
      timestamp: new Date()
    }));
  }

  return this.save();
};

// Instance method to add error
usageSyncSchema.methods.addError = function(error) {
  this.errors.push({
    code: error.code || 'SYNC_ERROR',
    message: error.message,
    timestamp: new Date(),
    details: error.details || null
  });
  return this;
};

// Instance method to add warning
usageSyncSchema.methods.addWarning = function(warning) {
  this.warnings.push({
    code: warning.code || 'WARNING',
    message: warning.message,
    timestamp: new Date()
  });
  return this;
};

const UsageSync = mongoose.model('UsageSync', usageSyncSchema);

export default UsageSync;