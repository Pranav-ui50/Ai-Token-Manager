import mongoose from 'mongoose';

const ACTION_TYPES = [
  // Authentication actions
  'login',
  'logout',
  'login_failed',
  'password_reset',
  'password_changed',
  'email_verified',

  // CRUD actions
  'create',
  'read',
  'update',
  'delete',

  // Import/Export
  'import',
  'export',

  // User actions
  'user_invited',
  'user_removed',
  'role_changed',

  // Organization actions
  'organization_created',
  'organization_updated',
  'organization_settings_updated',
  'organization_deleted',

  // Project actions
  'project_created',
  'project_updated',
  'project_deleted',

  // Provider actions
  'provider_created',
  'provider_updated',
  'provider_activated',
  'provider_deactivated',

  // Model actions
  'model_created',
  'model_updated',
  'pricing_updated',

  // Plan actions
  'plan_created',
  'plan_updated',
  'plan_activated',
  'plan_deactivated',

  // Integration actions
  'integration_created',
  'integration_updated',
  'integration_tested',

  // API Key actions
  'api_key_created',
  'api_key_revoked',

  // Webhook actions
  'webhook_created',
  'webhook_updated',
  'webhook_deleted',

  // Report actions
  'report_created',
  'report_generated',
  'report_exported',
  'report_deleted',

  // Simulation actions
  'simulation_created',
  'simulation_run',
  'simulation_deleted',

  // Settings actions
  'settings_updated',
  'profile_updated',

  // Bulk actions
  'bulk_create',
  'bulk_update',
  'bulk_delete',

  // Payment actions
  'payment_created',
  'payment_verified',
  'payment_failed',
  'payment_refunded',
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',

  // System actions
  'system_error',
  'system_warning',
  'system_info'
];

const RESOURCE_TYPES = [
  'user',
  'organization',
  'project',
  'provider',
  'model',
  'feature',
  'plan',
  'simulation',
  'integration',
  'api_key',
  'webhook',
  'report',
  'notification',
  'pricing_history',
  'role',
  'invitation',
  'settings',
  'auth',
  'payment',
  'invoice',
  'subscription'
];

const SEVERITY_LEVELS = ['info', 'warning', 'error', 'critical'];

const auditLogSchema = new mongoose.Schema({
  // Organization scope (for multi-tenant filtering)
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },

  // User who performed the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Action details
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: ACTION_TYPES,
    index: true
  },

  // Resource affected
  resourceType: {
    type: String,
    required: [true, 'Resource type is required'],
    enum: RESOURCE_TYPES,
    index: true
  },

  resourceId: {
    type: String,
    index: true
  },

  // Resource name for display (denormalized for quick reference)
  resourceName: {
    type: String,
    trim: true
  },

  // Detailed description
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Before and after states (for tracking changes)
  beforeState: {
    type: mongoose.Schema.Types.Mixed
  },

  afterState: {
    type: mongoose.Schema.Types.Mixed
  },

  // Changes summary (diff between before and after)
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],

  // Request context
  context: {
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    requestMethod: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    requestPath: {
      type: String,
      trim: true
    },
    requestId: {
      type: String,
      trim: true
    }
  },

  // Severity level
  severity: {
    type: String,
    enum: SEVERITY_LEVELS,
    default: 'info',
    index: true
  },

  // Status of the action
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
    index: true
  },

  // Error details (if action failed)
  error: {
    message: String,
    code: String,
    stack: String
  },

  // Additional metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Tags for filtering
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Duration of the action (in milliseconds)
  duration: {
    type: Number,
    min: 0
  },

  // Timestamp (already included via timestamps option, but explicit for clarity)
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  timestamps: false, // Only need createdAt, no updatedAt for logs
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  }
});

// Compound indexes for common queries
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, resourceType: 1, resourceId: 1 });
auditLogSchema.index({ organization: 1, severity: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

// TTL index for automatic cleanup (optional - can be configured)
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

// Virtual for formatted action
auditLogSchema.virtual('formattedAction').get(function () {
  return this.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// Static method to log an action
auditLogSchema.statics.log = async function (logData) {
  const log = new this(logData);
  return log.save();
};

// Static method to log with diff calculation
auditLogSchema.statics.logWithDiff = async function ({
  organization,
  user,
  action,
  resourceType,
  resourceId,
  resourceName,
  beforeState,
  afterState,
  context,
  metadata
}) {
  // Calculate changes
  const changes = [];
  if (beforeState && afterState) {
    const allKeys = new Set([...Object.keys(beforeState), ...Object.keys(afterState)]);
    for (const key of allKeys) {
      if (JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key])) {
        changes.push({
          field: key,
          oldValue: beforeState[key],
          newValue: afterState[key]
        });
      }
    }
  }

  return this.log({
    organization,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    beforeState,
    afterState,
    changes,
    context,
    metadata
  });
};

// Static method to get logs for an organization
auditLogSchema.statics.findByOrganization = function (organizationId, options = {}) {
  const {
    action,
    resourceType,
    resourceId,
    userId,
    severity,
    status,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50,
    sort = '-createdAt'
  } = options;

  const query = { organization: organizationId };

  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (resourceId) query.resourceId = resourceId;
  if (userId) query.user = userId;
  if (severity) query.severity = severity;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { resourceName: { $regex: search, $options: 'i' } }
    ];
  }

  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .populate('organization', 'name');
};

// Static method to get logs for a user
auditLogSchema.statics.findByUser = function (userId, options = {}) {
  const { page = 1, limit = 50, sort = '-createdAt' } = options;

  return this.find({ user: userId })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .populate('organization', 'name');
};

// Static method to get logs for a resource
auditLogSchema.statics.findByResource = function (resourceType, resourceId, options = {}) {
  const { page = 1, limit = 50, sort = '-createdAt' } = options;

  return this.find({ resourceType, resourceId })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .populate('organization', 'name');
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = function (organizationId, limit = 10) {
  return this.find({ organization: organizationId })
    .sort('-createdAt')
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .select('action resourceType resourceName description createdAt severity status');
};

// Static method to get statistics
auditLogSchema.statics.getStatistics = async function (organizationId, startDate, endDate) {
  const match = {
    organization: mongoose.Types.ObjectId(organizationId),
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          action: '$action',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        total: { $sum: '$count' },
        success: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'success'] }, '$count', 0]
          }
        },
        failure: {
          $sum: {
            $cond: [{ $eq: ['$_id.status', 'failure'] }, '$count', 0]
          }
        }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const timeline = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const topUsers = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$user',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    { $unwind: '$userDetails' },
    {
      $project: {
        userId: '$_id',
        name: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] },
        email: '$userDetails.email',
        count: 1
      }
    }
  ]);

  return {
    actionStats: stats,
    timeline,
    topUsers
  };
};

// Static method to export logs
auditLogSchema.statics.exportLogs = async function (organizationId, options = {}) {
  const logs = await this.findByOrganization(organizationId, { ...options, limit: 10000 });
  return logs;
};

// Static method to clean old logs
auditLogSchema.statics.cleanOldLogs = async function (daysOld = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });

  return result;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;

export { ACTION_TYPES, RESOURCE_TYPES, SEVERITY_LEVELS };