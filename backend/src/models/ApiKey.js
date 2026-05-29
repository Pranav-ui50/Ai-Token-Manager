/**
 * ApiKey Model
 *
 * MongoDB model for user API key management.
 * FR-48: API Credential Management
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const API_KEY_PREFIX = 'atm_'; // API Token Manager prefix
const API_KEY_LENGTH = 32;

const apiKeySchema = new mongoose.Schema(
  {
    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },

    // User who owns this key
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },

    // Key identification
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
      maxlength: [100, 'API key name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Key values
    prefix: {
      type: String,
      required: true,
      default: API_KEY_PREFIX
    },
    keyHash: {
      type: String,
      required: true,
      select: false // Never return the hash
    },
    keyLast4: {
      type: String,
      required: true
    },

    // Permissions
    permissions: [{
      type: String,
      enum: [
        'read:providers',
        'write:providers',
        'read:models',
        'write:models',
        'read:features',
        'write:features',
        'read:plans',
        'write:plans',
        'read:projects',
        'write:projects',
        'read:analytics',
        'read:simulations',
        'write:simulations',
        'read:integrations',
        'write:integrations',
        'admin'
      ]
    }],

    // Scopes - more granular than permissions
    scopes: [{
      resource: {
        type: String,
        required: true
      },
      actions: [{
        type: String,
        enum: ['read', 'write', 'delete', 'admin']
      }]
    }],

    // Rate limiting
    rateLimit: {
      requestsPerMinute: {
        type: Number,
        default: 60,
        min: [1, 'Rate limit must be at least 1']
      },
      requestsPerDay: {
        type: Number,
        default: 10000,
        min: [100, 'Daily limit must be at least 100']
      }
    },

    // Expiration
    expiresAt: {
      type: Date,
      default: null // null means no expiration
    },

    // Last used
    lastUsedAt: {
      type: Date,
      default: null
    },
    lastUsedIp: {
      type: String,
      default: null
    },
    lastUsedUserAgent: {
      type: String,
      default: null
    },

    // Usage statistics
    usageCount: {
      total: {
        type: Number,
        default: 0
      },
      lastDay: {
        type: Number,
        default: 0
      },
      lastWeek: {
        type: Number,
        default: 0
      },
      lastMonth: {
        type: Number,
        default: 0
      }
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked', 'expired'],
      default: 'active'
    },

    // Allowed IPs (optional restriction)
    allowedIps: [{
      type: String,
      validate: {
        validator: function (v) {
          // Validate IPv4 or CIDR notation
          const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
          return ipv4Regex.test(v);
        },
        message: 'Invalid IP address or CIDR notation'
      }
    }],

    // Allowed referrers (optional restriction)
    allowedReferrers: [{
      type: String
    }],

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    revokeReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.keyHash;
        return ret;
      }
    }
  }
);

// Indexes
apiKeySchema.index({ organization: 1, user: 1 });
apiKeySchema.index({ organization: 1, status: 1 });
apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });

// Generate a new API key
apiKeySchema.statics.generateKey = function () {
  const key = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
  return API_KEY_PREFIX + key;
};

// Hash an API key for storage
apiKeySchema.statics.hashKey = function (key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// Get the last 4 characters of a key
apiKeySchema.statics.getLast4 = function (key) {
  return key.slice(-4);
};

// Static method to find by organization
apiKeySchema.statics.findByOrganization = function (organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to find by user
apiKeySchema.statics.findByUser = function (userId) {
  return this.find({ user: userId, status: 'active' })
    .sort({ createdAt: -1 });
};

// Static method to validate key format
apiKeySchema.statics.isValidFormat = function (key) {
  return key && key.startsWith(API_KEY_PREFIX) && key.length === (API_KEY_PREFIX.length + API_KEY_LENGTH * 2);
};

// Static method to find and validate a key
apiKeySchema.statics.findAndValidate = async function (key, ip = null, userAgent = null) {
  if (!this.isValidFormat(key)) {
    return null;
  }

  const keyHash = this.hashKey(key);
  const apiKey = await this.findOne({ keyHash, status: 'active' })
    .populate('user', 'firstName lastName email role organization')
    .populate('organization', 'name isActive');

  if (!apiKey) {
    return null;
  }

  // Check expiration
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    apiKey.status = 'expired';
    await apiKey.save();
    return null;
  }

  // Check IP restriction
  if (apiKey.allowedIps && apiKey.allowedIps.length > 0 && ip) {
    const isAllowed = apiKey.allowedIps.some(allowedIp => {
      // Simple IP check - for CIDR, implement more complex logic
      if (allowedIp.includes('/')) {
        // CIDR notation - simplified check
        const [network] = allowedIp.split('/');
        return ip.startsWith(network.split('.').slice(0, 3).join('.'));
      }
      return allowedIp === ip;
    });

    if (!isAllowed) {
      return null;
    }
  }

  // Update last used
  apiKey.lastUsedAt = new Date();
  apiKey.lastUsedIp = ip;
  apiKey.lastUsedUserAgent = userAgent;
  apiKey.usageCount.total += 1;

  await apiKey.save();

  return apiKey;
};

// Method to check if key has permission
apiKeySchema.methods.hasPermission = function (permission) {
  // Admin has all permissions
  if (this.permissions.includes('admin')) {
    return true;
  }
  return this.permissions.includes(permission);
};

// Method to check scope
apiKeySchema.methods.hasScope = function (resource, action) {
  // Admin permission grants all scopes
  if (this.permissions.includes('admin')) {
    return true;
  }

  const scope = this.scopes.find(s => s.resource === resource);
  if (!scope) {
    return false;
  }
  return scope.actions.includes(action);
};

// Method to revoke key
apiKeySchema.methods.revoke = async function (revokedBy, reason = null) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokeReason = reason;
  await this.save();
};

// Method to check if key is expired
apiKeySchema.methods.isExpired = function () {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

// Method to mask the key for display
apiKeySchema.methods.getMaskedKey = function () {
  return `${this.prefix}****${this.keyLast4}`;
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;