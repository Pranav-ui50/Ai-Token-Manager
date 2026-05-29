/**
 * Provider Model
 *
 * MongoDB model for AI service providers (OpenAI, Anthropic, etc.)
 */

import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
      unique: true,
      maxlength: [50, 'Provider name cannot exceed 50 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    logo: {
      type: String,
      default: null
    },
    website: {
      type: String,
      default: null
    },
    apiEndpoint: {
      type: String,
      default: null
    },
    authType: {
      type: String,
      enum: ['api_key', 'oauth', 'custom'],
      default: 'api_key'
    },
    authConfig: {
      headerName: {
        type: String,
        default: 'Authorization'
      },
      headerPrefix: {
        type: String,
        default: 'Bearer'
      },
      apiKeyPrefix: {
        type: String,
        default: ''
      }
    },
    settings: {
      supportsStreaming: {
        type: Boolean,
        default: false
      },
      supportsVision: {
        type: Boolean,
        default: false
      },
      supportsFunctionCalling: {
        type: Boolean,
        default: false
      },
      defaultMaxTokens: {
        type: Number,
        default: 4096
      },
      requestTimeout: {
        type: Number,
        default: 60000
      },
      rateLimitPerMinute: {
        type: Number,
        default: 60
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
// Note: unique: true in schema already creates indexes on 'slug' and 'name'
providerSchema.index({ isActive: 1 });

// Virtual for model count
providerSchema.virtual('modelCount', {
  ref: 'AIModel',
  localField: '_id',
  foreignField: 'provider',
  count: true
});

// Virtual for models
providerSchema.virtual('models', {
  ref: 'AIModel',
  localField: '_id',
  foreignField: 'provider'
});

// Pre-save middleware to generate slug
providerSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method to find active providers
providerSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find by slug
providerSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase(), isActive: true });
};

const Provider = mongoose.model('Provider', providerSchema);

export default Provider;