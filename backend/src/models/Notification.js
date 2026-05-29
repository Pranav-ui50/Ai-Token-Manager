/**
 * Notification Model
 *
 * MongoDB model for user notifications.
 * FR-49: Pricing change notifications
 * FR-50: Low margin alerts
 * FR-51: Usage spike alerts
 */

import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  'pricing_change',    // FR-49: Pricing change alerts
  'low_margin',        // FR-50: Low margin notifications
  'usage_spike',       // FR-51: Usage spike alerts
  'system',            // System notifications
  'feature',           // Feature-related notifications
  'plan',               // Plan-related notifications
  'integration',        // Integration notifications
  'security'            // Security-related notifications
];

const NOTIFICATION_SEVERITY = ['info', 'warning', 'critical', 'urgent'];

const NOTIFICATION_STATUS = ['unread', 'read', 'resolved', 'dismissed'];

const notificationSchema = new mongoose.Schema(
  {
    // Organization (for multi-tenant isolation)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },

    // User who receives the notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },

    // Notification type
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: [true, 'Notification type is required']
    },

    // Notification title
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    // Notification message
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },

    // Severity level
    severity: {
      type: String,
      enum: NOTIFICATION_SEVERITY,
      default: 'info'
    },

    // Status
    status: {
      type: String,
      enum: NOTIFICATION_STATUS,
      default: 'unread'
    },

    // Related resource (optional)
    resource: {
      type: {
        type: String,
        enum: ['provider', 'model', 'feature', 'plan', 'simulation', 'integration', 'project']
      },
      id: {
        type: mongoose.Schema.Types.ObjectId
      }
    },

    // Action links (optional)
    actions: [{
      label: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['primary', 'secondary', 'danger'],
        default: 'primary'
      }
    }],

    // Additional data payload (flexible)
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Email notification settings
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      }
    },

    // Read/dismiss tracking
    readAt: {
      type: Date,
      default: null
    },
    dismissedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Priority for sorting
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },

    // Expiration (auto-delete after this date)
    expiresAt: {
      type: Date,
      default: null
    },

    // Audit
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
        return ret;
      }
    }
  }
);

// Indexes
notificationSchema.index({ organization: 1, user: 1, createdAt: -1 });
notificationSchema.index({ organization: 1, status: 1 });
notificationSchema.index({ organization: 1, type: 1 });
notificationSchema.index({ user: 1, status: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for is read
notificationSchema.virtual('isRead').get(function () {
  return this.status !== 'unread';
});

// Static method to find by user
notificationSchema.statics.findByUser = function (userId, filters = {}) {
  const query = { user: userId };
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('user', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName email');
};

// Static method to find unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ user: userId, status: 'unread' });
};

// Static method to find by organization
notificationSchema.statics.findByOrganization = function (organizationId, filters = {}) {
  const query = { organization: organizationId };
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('user', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName email');
};

// Static method to create pricing change notification
notificationSchema.statics.createPricingChangeNotification = async function (data) {
  const { organizationId, userId, providerName, modelName, oldPrice, newPrice, changePercent } = data;

  const severity = Math.abs(changePercent) > 20 ? 'critical' : Math.abs(changePercent) > 10 ? 'warning' : 'info';
  const direction = changePercent > 0 ? 'increased' : 'decreased';

  return this.create({
    organization: organizationId,
    user: userId,
    type: 'pricing_change',
    title: `Pricing Update: ${modelName}`,
    message: `${providerName} ${modelName} pricing has ${direction} by ${Math.abs(changePercent).toFixed(1)}%. ${direction === 'increased' ? 'Old' : 'Previous'} price: $${oldPrice}/1M tokens. New price: $${newPrice}/1M tokens.`,
    severity,
    resource: data.modelId ? { type: 'model', id: data.modelId } : null,
    data: {
      providerName,
      modelName,
      oldPrice,
      newPrice,
      changePercent,
      effectiveDate: data.effectiveDate || new Date()
    },
    priority: severity === 'critical' ? 10 : severity === 'warning' ? 7 : 5,
    actions: [
      { label: 'View Model', url: `/models/${data.modelId}`, type: 'primary' },
      { label: 'Update Pricing', url: `/pricing`, type: 'secondary' }
    ]
  });
};

// Static method to create low margin notification
notificationSchema.statics.createLowMarginNotification = async function (data) {
  const { organizationId, userId, planName, featureName, currentMargin, thresholdMargin } = data;

  const severity = currentMargin < 5 ? 'critical' : currentMargin < thresholdMargin ? 'warning' : 'info';

  return this.create({
    organization: organizationId,
    user: userId,
    type: 'low_margin',
    title: `Low Margin Alert: ${featureName || planName}`,
    message: `${featureName ? `Feature "${featureName}"` : `Plan "${planName}"`} is operating at ${currentMargin.toFixed(1)}% margin, which is below the threshold of ${thresholdMargin}%. Consider adjusting pricing or reviewing costs.`,
    severity,
    resource: data.planId ? { type: 'plan', id: data.planId } : data.featureId ? { type: 'feature', id: data.featureId } : null,
    data: {
      planName,
      featureName,
      currentMargin,
      thresholdMargin
    },
    priority: severity === 'critical' ? 10 : severity === 'warning' ? 8 : 6,
    actions: [
      { label: 'View Analytics', url: '/analytics', type: 'primary' },
      { label: 'Adjust Pricing', url: `/plans/${data.planId}`, type: 'secondary' }
    ]
  });
};

// Static method to create usage spike notification
notificationSchema.statics.createUsageSpikeNotification = async function (data) {
  const { organizationId, userId, featureName, normalUsage, currentUsage, spikePercent } = data;

  const severity = spikePercent > 200 ? 'critical' : spikePercent > 100 ? 'warning' : 'info';

  return this.create({
    organization: organizationId,
    user: userId,
    type: 'usage_spike',
    title: `Usage Spike Detected: ${featureName || 'Features'}`,
    message: `Unusual usage activity detected. ${featureName ? `Feature "${featureName}"` : 'Usage'} has increased by ${spikePercent.toFixed(1)}% compared to normal levels. Normal: ${normalUsage.toLocaleString()} requests. Current: ${currentUsage.toLocaleString()} requests.`,
    severity,
    resource: data.featureId ? { type: 'feature', id: data.featureId } : null,
    data: {
      featureName,
      normalUsage,
      currentUsage,
      spikePercent,
      detectedAt: new Date()
    },
    priority: severity === 'critical' ? 10 : severity === 'warning' ? 8 : 5,
    actions: [
      { label: 'View Analytics', url: '/analytics', type: 'primary' },
      { label: 'Check Costs', url: '/pricing', type: 'secondary' }
    ]
  });
};

// Static method to create system notification
notificationSchema.statics.createSystemNotification = async function (data) {
  const { organizationId, userIds, title, message, severity = 'info', resource = null, actions = [] } = data;

  const notifications = userIds.map(userId => ({
    organization: organizationId,
    user: userId,
    type: 'system',
    title,
    message,
    severity,
    resource,
    data: data.data || {},
    priority: data.priority || 5,
    actions
  }));

  return this.insertMany(notifications);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  if (this.status === 'unread') {
    this.status = 'read';
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Instance method to dismiss
notificationSchema.methods.dismiss = async function () {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  await this.save();
  return this;
};

// Instance method to resolve
notificationSchema.methods.resolve = async function (resolvedBy = null) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  if (resolvedBy) {
    this.resolvedBy = resolvedBy;
  }
  await this.save();
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;