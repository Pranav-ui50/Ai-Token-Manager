/**
 * Pricing History Model
 *
 * Tracks pricing changes for AI models over time.
 */

import mongoose from 'mongoose';

const pricingHistorySchema = new mongoose.Schema(
  {
    model: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIModel',
      required: [true, 'Model reference is required'],
      index: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Provider reference is required'],
      index: true
    },
    // Previous pricing
    previousPricing: {
      inputPrice: {
        type: Number,
        default: 0
      },
      outputPrice: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      },
      unit: {
        type: String,
        enum: ['per_token', 'per_request', 'per_second', 'per_image'],
        default: 'per_token'
      },
      pricePerUnit: {
        type: Number,
        default: 1000000
      }
    },
    // New pricing
    newPricing: {
      inputPrice: {
        type: Number,
        required: true
      },
      outputPrice: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        default: 'USD'
      },
      unit: {
        type: String,
        enum: ['per_token', 'per_request', 'per_second', 'per_image'],
        default: 'per_token'
      },
      pricePerUnit: {
        type: Number,
        default: 1000000
      }
    },
    // Price change details
    priceChange: {
      inputPriceChange: {
        type: Number,
        default: 0
      },
      outputPriceChange: {
        type: Number,
        default: 0
      },
      inputPriceChangePercent: {
        type: Number,
        default: 0
      },
      outputPriceChangePercent: {
        type: Number,
        default: 0
      }
    },
    // Who made the change
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Reason for change
    reason: {
      type: String,
      enum: ['provider_update', 'manual_adjustment', 'market_adjustment', 'promotional', 'other'],
      default: 'provider_update'
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    // Effective dates
    effectiveFrom: {
      type: Date,
      default: Date.now
    },
    // Source of pricing information
    source: {
      type: String,
      enum: ['official', 'estimated', 'manual'],
      default: 'official'
    },
    // Verification status
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
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
pricingHistorySchema.index({ model: 1, createdAt: -1 });
pricingHistorySchema.index({ provider: 1, createdAt: -1 });
pricingHistorySchema.index({ effectiveFrom: 1 });

// Virtual for formatted price change
pricingHistorySchema.virtual('formattedChange').get(function () {
  const inputChange = this.priceChange.inputPriceChangePercent || 0;
  const outputChange = this.priceChange.outputPriceChangePercent || 0;

  return {
    input: {
      value: this.priceChange.inputPriceChange,
      percent: inputChange,
      direction: inputChange > 0 ? 'increase' : inputChange < 0 ? 'decrease' : 'no_change'
    },
    output: {
      value: this.priceChange.outputPriceChange,
      percent: outputChange,
      direction: outputChange > 0 ? 'increase' : outputChange < 0 ? 'decrease' : 'no_change'
    }
  };
});

// Static method to create pricing history entry
pricingHistorySchema.statics.recordChange = async function (data) {
  const {
    modelId,
    providerId,
    previousPricing,
    newPricing,
    changedBy,
    reason = 'provider_update',
    notes = '',
    source = 'official'
  } = data;

  // Calculate price changes
  const inputPriceChange = (newPricing.inputPrice || 0) - (previousPricing.inputPrice || 0);
  const outputPriceChange = (newPricing.outputPrice || 0) - (previousPricing.outputPrice || 0);

  // Calculate percentage changes
  // If previous price was 0, treat as 100% change (new pricing)
  const inputPriceChangePercent = previousPricing.inputPrice
    ? ((newPricing.inputPrice - previousPricing.inputPrice) / previousPricing.inputPrice) * 100
    : (newPricing.inputPrice ? 100 : 0); // New price = 100% increase from 0
  const outputPriceChangePercent = previousPricing.outputPrice
    ? ((newPricing.outputPrice - previousPricing.outputPrice) / previousPricing.outputPrice) * 100
    : (newPricing.outputPrice ? 100 : 0); // New price = 100% increase from 0

  const history = await this.create({
    model: modelId,
    provider: providerId,
    previousPricing,
    newPricing,
    priceChange: {
      inputPriceChange,
      outputPriceChange,
      inputPriceChangePercent,
      outputPriceChangePercent
    },
    changedBy,
    reason,
    notes,
    source
  });

  return history;
};

// Static method to get pricing history for a model
pricingHistorySchema.statics.getHistoryForModel = function (modelId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.find({ model: modelId })
    .populate('changedBy', 'firstName lastName email')
    .populate('verifiedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get pricing history for a provider
pricingHistorySchema.statics.getHistoryForProvider = function (providerId, options = {}) {
  const { limit = 20, skip = 0 } = options;

  return this.find({ provider: providerId })
    .populate('model', 'name displayName type')
    .populate('changedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get recent pricing changes
pricingHistorySchema.statics.getRecentChanges = function (options = {}) {
  const { days = 7, limit = 50 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    createdAt: { $gte: startDate }
  })
    .populate('model', 'name displayName type')
    .populate('provider', 'name displayName')
    .populate('changedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get price trends
pricingHistorySchema.statics.getPriceTrends = async function (modelId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const trends = await this.aggregate([
    {
      $match: {
        model: mongoose.Types.ObjectId.createFromHexString(modelId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $sort: { createdAt: 1 }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        avgInputPrice: { $avg: '$newPricing.inputPrice' },
        avgOutputPrice: { $avg: '$newPricing.outputPrice' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return trends;
};

// Method to verify pricing change
pricingHistorySchema.methods.verify = async function (userId) {
  this.isVerified = true;
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  return this.save();
};

const PricingHistory = mongoose.model('PricingHistory', pricingHistorySchema);

export default PricingHistory;