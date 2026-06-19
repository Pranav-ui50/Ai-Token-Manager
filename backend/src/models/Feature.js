/**
 * Feature Model
 *
 * Represents a SaaS feature that uses AI models.
 * Maps features to AI models with token consumption estimates.
 */

import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  // Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Project (required - features must be linked to a project)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project/Product is required. Features must be linked to a project.'],
    index: true
  },

  // Feature identification
  name: {
    type: String,
    required: [true, 'Feature name is required'],
    trim: true,
    maxlength: [100, 'Feature name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Feature category
  category: {
    type: String,
    enum: ['chat', 'completion', 'embedding', 'image', 'audio', 'video', 'other'],
    default: 'other'
  },

  // AI Model mapping (optional - can be configured later)
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIModel'
  },
  // Dynamic model identifier (for models fetched from provider API)
  modelIdentifier: {
    type: String,
    trim: true,
    default: null
  },
  // Model display name (cached for dynamic models)
  modelDisplayName: {
    type: String,
    trim: true,
    default: null
  },
  // Model capabilities (cached for dynamic models)
  modelCapabilities: {
    contextWindow: Number,
    maxOutputTokens: Number,
    supportsVision: { type: Boolean, default: false },
    supportsFunctionCalling: { type: Boolean, default: true },
    supportsStreaming: { type: Boolean, default: true }
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
  },

  // Token consumption estimates
  tokenEstimates: {
    // Input tokens per request
    inputTokensPerRequest: {
      type: Number,
      default: 0,
      min: [0, 'Input tokens cannot be negative']
    },
    // Output tokens per request
    outputTokensPerRequest: {
      type: Number,
      default: 0,
      min: [0, 'Output tokens cannot be negative']
    },
    // Average tokens (if variable)
    averageTokensPerRequest: {
      type: Number,
      default: 0,
      min: [0, 'Average tokens cannot be negative']
    },
    // Token calculation method
    calculationMethod: {
      type: String,
      enum: ['fixed', 'dynamic', 'user-based'],
      default: 'fixed'
    },
    // For dynamic calculation (formula or multiplier)
    dynamicMultiplier: {
      type: Number,
      default: 1,
      min: [0.1, 'Multiplier must be at least 0.1']
    }
  },

  // Infrastructure overhead costs (FR-21)
  infrastructureCost: {
    // Fixed cost per request (e.g., compute, storage)
    fixedCostPerRequest: {
      type: Number,
      default: 0,
      min: [0, 'Fixed cost cannot be negative']
    },
    // Percentage overhead on token costs (e.g., 10% for API gateway, caching)
    overheadPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Overhead percentage cannot be negative'],
      max: [100, 'Overhead percentage cannot exceed 100']
    },
    // Monthly fixed costs (e.g., reserved infrastructure)
    monthlyFixedCost: {
      type: Number,
      default: 0,
      min: [0, 'Monthly fixed cost cannot be negative']
    },
    // Cost currency
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP']
    },
    // Infrastructure type
    infrastructureType: {
      type: String,
      enum: ['serverless', 'dedicated', 'hybrid', 'shared'],
      default: 'serverless'
    },
    // Notes about infrastructure
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },

  // Usage limits per feature
  limits: {
    maxRequestsPerUser: {
      type: Number,
      default: null // null means unlimited
    },
    maxTokensPerUser: {
      type: Number,
      default: null
    },
    maxRequestsPerMonth: {
      type: Number,
      default: null
    }
  },

  // Feature settings
  settings: {
    enabled: {
      type: Boolean,
      default: true
    },
    requiresAuth: {
      type: Boolean,
      default: true
    },
    cacheEnabled: {
      type: Boolean,
      default: false
    },
    cacheTTL: {
      type: Number,
      default: 3600 // seconds
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'deprecated'],
    default: 'active'
  },

  // For tracking disabled resources (plan limit management)
  disabledAt: {
    type: Date
  },
  disabledReason: {
    type: String,
    enum: ['plan_limit', 'manual', null],
    default: null
  },
  previousStatus: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', null],
    default: null
  },

  // Metadata
  metadata: {
    tags: [{
      type: String,
      trim: true
    }],
    version: {
      type: String,
      default: '1.0.0'
    },
    notes: {
      type: String,
      trim: true
    }
  },

  // Usage statistics (denormalized)
  stats: {
    totalRequests: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date
    }
  },

  // Usage history for time-series analysis
  usageHistory: [{
    date: {
      type: Date,
      required: true
    },
    requests: {
      type: Number,
      default: 0
    },
    tokens: {
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
    cost: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    },
    avgLatency: {
      type: Number,
      default: 0
    }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
featureSchema.index({ organization: 1, slug: 1 }, { unique: true });
featureSchema.index({ organization: 1, category: 1 });
featureSchema.index({ organization: 1, status: 1 });
featureSchema.index({ organization: 1, project: 1 });
featureSchema.index({ model: 1 });
featureSchema.index({ provider: 1 });

// Virtual for calculated cost per request
featureSchema.virtual('costPerRequest').get(function() {
  return this.calculateCostSync();
});

// Pre-save middleware to generate slug
featureSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method to get features by organization
featureSchema.statics.findByOrganization = function(organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .populate('model', 'name type pricing')
    .populate('provider', 'name slug')
    .populate('project', 'name slug')
    .sort({ createdAt: -1 });
};

// Static method to get features by project
featureSchema.statics.findByProject = function(projectId) {
  return this.find({ project: projectId })
    .populate('model', 'name type pricing')
    .populate('provider', 'name slug')
    .populate('project', 'name slug')
    .sort({ createdAt: -1 });
};

// Static method to get active features
featureSchema.statics.findActive = function(organizationId) {
  return this.find({
    organization: organizationId,
    status: 'active',
    'settings.enabled': true
  })
    .populate('model', 'name type pricing')
    .populate('provider', 'name slug')
    .populate('project', 'name slug');
};

// Instance method to calculate cost using actual model pricing
featureSchema.methods.calculateCost = async function(inputTokens, outputTokens) {
  const actualInputTokens = inputTokens || this.tokenEstimates?.inputTokensPerRequest || 0;
  const actualOutputTokens = outputTokens || this.tokenEstimates?.outputTokensPerRequest || 0;

  // Get model pricing if available
  let inputPricePerToken = 0.00001; // Default fallback
  let outputPricePerToken = 0.00003; // Default fallback

  if (this.model) {
    try {
      const AIModel = mongoose.model('AIModel');
      const model = await AIModel.findById(this.model).select('pricing');
      if (model?.pricing) {
        inputPricePerToken = model.pricing.inputTokenPrice || inputPricePerToken;
        outputPricePerToken = model.pricing.outputTokenPrice || outputPricePerToken;
      }
    } catch (e) {
      // Use defaults if model not found
    }
  }

  // Use feature-level pricing overrides if set
  if (this.pricing?.inputTokenPrice !== undefined) {
    inputPricePerToken = this.pricing.inputTokenPrice;
  }
  if (this.pricing?.outputTokenPrice !== undefined) {
    outputPricePerToken = this.pricing.outputTokenPrice;
  }

  const inputCost = actualInputTokens * inputPricePerToken;
  const outputCost = actualOutputTokens * outputPricePerToken;

  // Add infrastructure overhead (FR-21)
  const baseTokenCost = inputCost + outputCost;
  const overheadCost = baseTokenCost * ((this.infrastructureCost?.overheadPercentage || 0) / 100);
  const fixedCostPerRequest = this.infrastructureCost?.fixedCostPerRequest || 0;

  return baseTokenCost + overheadCost + fixedCostPerRequest;
};

// Synchronous version for virtual (uses cached pricing)
featureSchema.methods.calculateCostSync = function(inputTokens, outputTokens) {
  const actualInputTokens = inputTokens || this.tokenEstimates?.inputTokensPerRequest || 0;
  const actualOutputTokens = outputTokens || this.tokenEstimates?.outputTokensPerRequest || 0;

  // Use feature-level pricing or defaults
  const inputPricePerToken = this.pricing?.inputTokenPrice || 0.00001;
  const outputPricePerToken = this.pricing?.outputTokenPrice || 0.00003;

  const inputCost = actualInputTokens * inputPricePerToken;
  const outputCost = actualOutputTokens * outputPricePerToken;

  const baseTokenCost = inputCost + outputCost;
  const overheadCost = baseTokenCost * ((this.infrastructureCost?.overheadPercentage || 0) / 100);
  const fixedCostPerRequest = this.infrastructureCost?.fixedCostPerRequest || 0;

  return baseTokenCost + overheadCost + fixedCostPerRequest;
};

// Instance method to calculate monthly cost estimate
featureSchema.methods.calculateMonthlyCost = function(requestsPerMonth, usersPerMonth = 1) {
  const costPerRequest = this.calculateCost();
  const variableCostPerMonth = costPerRequest * requestsPerMonth;
  const monthlyFixedCost = this.infrastructureCost?.monthlyFixedCost || 0;
  const totalMonthlyCost = variableCostPerMonth + monthlyFixedCost;

  return {
    tokenCost: costPerRequest * requestsPerMonth,
    infrastructureFixedCost: monthlyFixedCost,
    overheadCost: costPerRequest * requestsPerMonth * ((this.infrastructureCost?.overheadPercentage || 0) / 100),
    totalMonthlyCost,
    costPerUser: totalMonthlyCost / usersPerMonth,
    currency: this.infrastructureCost?.currency || 'USD'
  };
};

// Instance method to update stats
featureSchema.methods.updateStats = async function(tokens, cost) {
  this.stats.totalRequests += 1;
  this.stats.totalTokens += tokens || 0;
  this.stats.totalCost += cost || 0;
  this.stats.lastUsedAt = new Date();
  return this.save();
};

// Instance method to record usage in history
featureSchema.methods.recordUsage = async function(usageData) {
  const { requests = 1, tokens = 0, inputTokens = 0, outputTokens = 0, cost = 0, errorCount = 0, avgLatency = 0 } = usageData;

  // Update stats
  this.stats.totalRequests += requests;
  this.stats.totalTokens += tokens;
  this.stats.totalCost += cost;
  this.stats.lastUsedAt = new Date();

  // Add to usage history (keep last 90 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find or create today's entry
  let todayEntry = this.usageHistory.find(h => {
    const hDate = new Date(h.date);
    hDate.setHours(0, 0, 0, 0);
    return hDate.getTime() === today.getTime();
  });

  if (todayEntry) {
    todayEntry.requests += requests;
    todayEntry.tokens += tokens;
    todayEntry.inputTokens += inputTokens;
    todayEntry.outputTokens += outputTokens;
    todayEntry.cost += cost;
    todayEntry.errorCount += errorCount;
    todayEntry.avgLatency = (todayEntry.avgLatency + avgLatency) / 2; // Running average
  } else {
    this.usageHistory.push({
      date: today,
      requests,
      tokens,
      inputTokens,
      outputTokens,
      cost,
      errorCount,
      avgLatency
    });
  }

  // Keep only last 90 days
  if (this.usageHistory.length > 90) {
    this.usageHistory = this.usageHistory.slice(-90);
  }

  return this.save();
};

// Static method to get usage for date range
featureSchema.statics.getUsageForDateRange = function(organizationId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        organization: mongoose.Types.ObjectId.createFromHexString(organizationId)
      }
    },
    {
      $unwind: '$usageHistory'
    },
    {
      $match: {
        'usageHistory.date': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$usageHistory.date',
        totalRequests: { $sum: '$usageHistory.requests' },
        totalTokens: { $sum: '$usageHistory.tokens' },
        totalCost: { $sum: '$usageHistory.cost' },
        totalErrors: { $sum: '$usageHistory.errorCount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const Feature = mongoose.model('Feature', featureSchema);

export default Feature;