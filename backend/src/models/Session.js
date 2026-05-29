/**
 * Session Model
 *
 * MongoDB model for user session tracking.
 */

import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    // User reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Session identification
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // Token information
    refreshToken: {
      type: String,
      required: true,
      select: false
    },

    // Device and browser information
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown'
      },
      name: String, // e.g., "MacBook Pro", "iPhone 14"
      os: String, // e.g., "macOS 14.0", "iOS 17.0"
      osVersion: String
    },

    browser: {
      name: String, // e.g., "Chrome", "Safari", "Firefox"
      version: String
    },

    // Location information
    location: {
      ip: String,
      city: String,
      region: String,
      country: String,
      countryCode: String,
      timezone: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },

    // Session timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    lastActiveAt: {
      type: Date,
      default: Date.now
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    // Session status
    isActive: {
      type: Boolean,
      default: true
    },

    // Revocation info
    revokedAt: Date,
    revokedReason: {
      type: String,
      enum: ['user_logout', 'security', 'password_change', 'admin', 'expired', 'session_limit']
    },

    // Additional metadata
    metadata: {
      appVersion: String,
      platform: String, // 'web', 'ios', 'android', 'api'
      referrer: String,
      firstSession: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ user: 1, createdAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Static method to create session
sessionSchema.statics.createSession = async function (userId, sessionId, refreshToken, options = {}) {
  const {
    device = {},
    browser = {},
    location = {},
    expiresAt,
    metadata = {}
  } = options;

  const session = await this.create({
    user: userId,
    sessionId,
    refreshToken,
    device: {
      type: device.type || 'unknown',
      name: device.name,
      os: device.os,
      osVersion: device.osVersion
    },
    browser: {
      name: browser.name,
      version: browser.version
    },
    location: {
      ip: location.ip,
      city: location.city,
      region: location.region,
      country: location.country,
      countryCode: location.countryCode,
      timezone: location.timezone,
      coordinates: location.coordinates
    },
    expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    metadata
  });

  return session;
};

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessions = async function (userId) {
  return this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
    .sort({ lastActiveAt: -1 })
    .select('-refreshToken');
};

// Static method to revoke session
sessionSchema.statics.revokeSession = async function (sessionId, reason = 'user_logout') {
  return this.findOneAndUpdate(
    { sessionId },
    {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason
    },
    { new: true }
  );
};

// Static method to revoke all sessions for user
sessionSchema.statics.revokeAllSessions = async function (userId, reason = 'user_logout', excludeSessionId = null) {
  const query = {
    user: userId,
    isActive: true
  };

  if (excludeSessionId) {
    query.sessionId = { $ne: excludeSessionId };
  }

  return this.updateMany(query, {
    isActive: false,
    revokedAt: new Date(),
    revokedReason: reason
  });
};

// Static method to update activity
sessionSchema.statics.updateActivity = async function (sessionId) {
  return this.findOneAndUpdate(
    { sessionId, isActive: true },
    { lastActiveAt: new Date() },
    { new: true }
  );
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// Method to check if session is valid
sessionSchema.methods.isValid = function () {
  return this.isActive && this.expiresAt > new Date();
};

// Virtual for formatted device info
sessionSchema.virtual('deviceInfo').get(function () {
  const parts = [];
  if (this.browser?.name) parts.push(this.browser.name);
  if (this.browser?.version) parts.push(this.browser.version);
  if (this.device?.os) parts.push(`(${this.device.os})`);
  return parts.join(' ') || 'Unknown Device';
});

// Virtual for formatted location
sessionSchema.virtual('locationInfo').get(function () {
  const parts = [];
  if (this.location?.city) parts.push(this.location.city);
  if (this.location?.country) parts.push(this.location.country);
  return parts.join(', ') || 'Unknown Location';
});

const Session = mongoose.model('Session', sessionSchema);

export default Session;