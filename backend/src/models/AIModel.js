/**
 * AI Model Model
 *
 * MongoDB model for AI models within providers.
 */

import mongoose from 'mongoose';

const MODEL_TYPES = ['chat', 'completion', 'embedding', 'image', 'audio', 'other'];
const PRICING_TYPES = ['per_token', 'per_request', 'per_second', 'per_image'];

const aiModelSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Provider is required']
    },
    name: {
      type: String,
      required: [true, 'Model name is required'],
      trim: true,
      maxlength: [100, 'Model name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [150, 'Display name cannot exceed 150 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    type: {
      type: String,
      enum: MODEL_TYPES,
      default: 'chat'
    },
    capabilities: {
      supportsVision: {
        type: Boolean,
        default: false
      },
      supportsFunctionCalling: {
        type: Boolean,
        default: false
      },
      supportsStreaming: {
        type: Boolean,
        default: true
      },
      supportsJsonMode: {
        type: Boolean,
        default: false
      },
      contextWindow: {
        type: Number,
        default: 4096
      },
      maxOutputTokens: {
        type: Number,
        default: 4096
      }
    },
    pricing: {
      inputPrice: {
        type: Number,
        default: 0,
        min: [0, 'Input price cannot be negative']
      },
      outputPrice: {
        type: Number,
        default: 0,
        min: [0, 'Output price cannot be negative']
      },
      currency: {
        type: String,
        default: 'USD'
      },
      unit: {
        type: String,
        enum: PRICING_TYPES,
        default: 'per_token'
      },
      pricePerUnit: {
        type: Number,
        default: 1000000 // Price per million tokens
      }
    },
    defaults: {
      temperature: {
        type: Number,
        default: 0.7,
        min: [0, 'Temperature cannot be negative'],
        max: [2, 'Temperature cannot exceed 2']
      },
      topP: {
        type: Number,
        default: 1,
        min: [0, 'Top P cannot be negative'],
        max: [1, 'Top P cannot exceed 1']
      },
      frequencyPenalty: {
        type: Number,
        default: 0,
        min: [-2, 'Frequency penalty cannot be below -2'],
        max: [2, 'Frequency penalty cannot exceed 2']
      },
      presencePenalty: {
        type: Number,
        default: 0,
        min: [-2, 'Presence penalty cannot be below -2'],
        max: [2, 'Presence penalty cannot exceed 2']
      }
    },
    deprecated: {
      isDeprecated: {
        type: Boolean,
        default: false
      },
      replacementModel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AIModel',
        default: null
      },
      sunsetDate: {
        type: Date,
        default: null
      }
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
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
        delete ret.id;
        return ret;
      }
    }
  }
);

// Indexes
aiModelSchema.index({ provider: 1, slug: 1 }, { unique: true });
aiModelSchema.index({ provider: 1, name: 1 });
aiModelSchema.index({ type: 1 });
aiModelSchema.index({ isActive: 1 });

// Virtual for provider name
aiModelSchema.virtual('providerName', {
  ref: 'Provider',
  localField: 'provider',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to generate slug
aiModelSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('name')) {
    const Provider = mongoose.model('Provider');
    const provider = await Provider.findById(this.provider);

    if (provider) {
      this.slug = `${provider.slug}-${this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}`;
    }
  }
  next();
});

// Static method to find by provider
aiModelSchema.statics.findByProvider = function (providerId, activeOnly = true) {
  const query = { provider: providerId };
  if (activeOnly) query.isActive = true;
  return this.find(query).sort({ name: 1 });
};

// Static method to find active models
aiModelSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 }).populate('provider', 'name displayName slug');
};

// Static method to find by slug
aiModelSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase(), isActive: true }).populate('provider');
};

// Method to calculate cost for tokens
aiModelSchema.methods.calculateCost = function (inputTokens, outputTokens = 0) {
  if (this.pricing.unit !== 'per_token') {
    return 0; // Only calculate for per_token pricing
  }

  const inputCost = (inputTokens / this.pricing.pricePerUnit) * this.pricing.inputPrice;
  const outputCost = (outputTokens / this.pricing.pricePerUnit) * this.pricing.outputPrice;

  return inputCost + outputCost;
};

// Method to check if deprecated
aiModelSchema.methods.isDeprecatedModel = function () {
  return this.deprecated.isDeprecated &&
    (!this.deprecated.sunsetDate || new Date() < this.deprecated.sunsetDate);
};

const AIModel = mongoose.model('AIModel', aiModelSchema);

export default AIModel;