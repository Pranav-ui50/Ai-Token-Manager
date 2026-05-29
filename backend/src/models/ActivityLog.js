/**
 * Activity Log Model
 *
 * MongoDB model for user activity tracking.
 */

import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    // User reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Organization reference
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true
    },

    // Activity type
    type: {
      type: String,
      required: true,
      enum: [
        'login',
        'logout',
        'password_change',
        '2fa_enabled',
        '2fa_disabled',
        'profile_update',
        'api_key_created',
        'api_key_revoked',
        'organization_join',
        'organization_leave',
        'role_change',
        'settings_update',
        'session_revoked',
        'security_alert',
        'export_data',
        'failed_login'
      ],
      index: true
    },

    // Activity description
    description: {
      type: String,
      required: true
    },

    // IP address
    ipAddress: {
      type: String,
      index: true
    },

    // User agent
    userAgent: String,

    // Device info
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown'
      },
      name: String,
      os: String,
      browser: String
    },

    // Location info
    location: {
      city: String,
      region: String,
      country: String,
      countryCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },

    // Session ID (if applicable)
    sessionId: String,

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Status
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    },

    // Timestamp
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false, // Only use createdAt
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
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ organization: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });

// Static method to log activity
activityLogSchema.statics.log = async function (data) {
  const {
    user,
    organization,
    type,
    description,
    ipAddress,
    userAgent,
    device,
    location,
    sessionId,
    metadata,
    status = 'success'
  } = data;

  return this.create({
    user,
    organization,
    type,
    description,
    ipAddress,
    userAgent,
    device,
    location,
    sessionId,
    metadata,
    status
  });
};

// Static method to get user activities
activityLogSchema.statics.getUserActivities = async function (userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    type = null,
    startDate = null,
    endDate = null
  } = options;

  const query = { user: userId };

  if (type) {
    query.type = type;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .populate('organization', 'name');
};

// Static method to get organization activities
activityLogSchema.statics.getOrganizationActivities = async function (organizationId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    type = null,
    userId = null,
    startDate = null,
    endDate = null
  } = options;

  const query = { organization: organizationId };

  if (type) {
    query.type = type;
  }

  if (userId) {
    query.user = userId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'firstName lastName email role')
    .populate('organization', 'name');
};

// Static method to get recent logins
activityLogSchema.statics.getRecentLogins = async function (userId, limit = 10) {
  return this.find({
    user: userId,
    type: { $in: ['login', 'failed_login'] }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get active sessions (logins without logout)
activityLogSchema.statics.getActiveSessions = async function (userId) {
  const logins = await this.find({
    user: userId,
    type: 'login',
    status: 'success'
  })
    .sort({ createdAt: -1 })
    .limit(10);

  const sessionIds = logins.map(l => l.sessionId);

  const logouts = await this.find({
    user: userId,
    type: 'logout',
    sessionId: { $in: sessionIds }
  }).distinct('sessionId');

  return logins.filter(login => !logouts.includes(login.sessionId));
};

// Static method to get activity statistics
activityLogSchema.statics.getStatistics = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const loginsByDay = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        type: 'login',
        status: 'success',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const uniqueLocations = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        type: 'login',
        status: 'success',
        'location.country': { $exists: true },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          country: '$location.country',
          city: '$location.city'
        },
        count: { $sum: 1 },
        lastLogin: { $max: '$createdAt' }
      }
    },
    {
      $sort: { lastLogin: -1 }
    },
    {
      $limit: 10
    }
  ]);

  return {
    activityCounts: stats,
    loginsByDay,
    uniqueLocations
  };
};

// Static method to cleanup old logs
activityLogSchema.statics.cleanup = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });

  return result.deletedCount;
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;