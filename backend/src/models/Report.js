import mongoose from 'mongoose';

const REPORT_TYPES = [
  'cost_analysis',
  'margin_analysis',
  'profit_forecast',
  'usage_report',
  'feature_usage',
  'provider_comparison',
  'simulation_results',
  'custom'
];

const REPORT_STATUS = ['pending', 'processing', 'completed', 'failed'];

const FILE_FORMATS = ['pdf', 'excel', 'csv', 'json'];

const reportSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization is required'],
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true
  },

  // Report identification
  name: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true,
    maxlength: [200, 'Report name cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: REPORT_TYPES,
    required: [true, 'Report type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Report parameters
  parameters: {
    dateRange: {
      start: {
        type: Date,
        required: true
      },
      end: {
        type: Date,
        required: true
      }
    },
    features: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature'
    }],
    plans: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    }],
    providers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider'
    }],
    models: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIModel'
    }],
    groupBy: {
      type: String,
      enum: ['day', 'week', 'month', 'quarter', 'year'],
      default: 'month'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    filters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },

  // Generated data
  data: {
    summary: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    breakdown: [{
      category: String,
      subcategory: String,
      metrics: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
      }
    }],
    timeSeries: [{
      period: String,
      date: Date,
      metrics: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
      }
    }],
    charts: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },

  // File information
  file: {
    url: String,
    path: String,
    format: {
      type: String,
      enum: FILE_FORMATS
    },
    size: Number,
    generatedAt: Date
  },

  // Scheduling
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly'],
      default: 'once'
    },
    nextRun: Date,
    lastRun: Date,
    recipients: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },

  // Status tracking
  status: {
    type: String,
    enum: REPORT_STATUS,
    default: 'pending',
    index: true
  },
  error: {
    message: String,
    stack: String,
    occurredAt: Date
  },

  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },

  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
reportSchema.index({ organization: 1, type: 1 });
reportSchema.index({ organization: 1, status: 1 });
reportSchema.index({ organization: 1, createdAt: -1 });
reportSchema.index({ 'schedule.nextRun': 1 }, {
  sparse: true,
  partialFilterExpression: { 'schedule.isScheduled': true }
});

// Virtual for duration
reportSchema.virtual('duration').get(function () {
  if (this.parameters.dateRange.start && this.parameters.dateRange.end) {
    return this.parameters.dateRange.end - this.parameters.dateRange.start;
  }
  return null;
});

// Virtual for checking if completed
reportSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

// Virtual for checking if failed
reportSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

// Instance method to check access
reportSchema.methods.hasAccess = function (userId) {
  if (this.isPublic) return true;
  if (this.createdBy.toString() === userId.toString()) return true;
  if (this.sharedWith.some(s => s.user.toString() === userId.toString())) return true;
  return false;
};

// Static method to find by organization
reportSchema.statics.findByOrganization = function (organizationId, options = {}) {
  const query = { organization: organizationId };

  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  if (options.isTemplate !== undefined) query.isTemplate = options.isTemplate;

  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .populate('createdBy', 'firstName lastName email')
    .populate('parameters.features', 'name')
    .populate('parameters.plans', 'name');
};

// Static method to find scheduled reports
reportSchema.statics.findScheduled = function () {
  const now = new Date();
  return this.find({
    'schedule.isScheduled': true,
    'schedule.nextRun': { $lte: now },
    status: { $ne: 'processing' }
  });
};

// Static method to find templates
reportSchema.statics.findTemplates = function (organizationId) {
  return this.find({
    organization: organizationId,
    isTemplate: true
  }).sort({ name: 1 });
};

// Pre-save hook to validate date range
reportSchema.pre('save', function (next) {
  if (this.parameters.dateRange.start && this.parameters.dateRange.end) {
    if (this.parameters.dateRange.start > this.parameters.dateRange.end) {
      const error = new Error('Start date must be before end date');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

const Report = mongoose.model('Report', reportSchema);

export default Report;

export { REPORT_TYPES, REPORT_STATUS, FILE_FORMATS };