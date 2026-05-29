/**
 * User Model
 *
 * MongoDB model for user accounts.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import config from '../config/index.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't return password by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'User role is required']
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    avatar: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },
    preferences: {
      notifications: {
        emailNotifications: {
          type: Boolean,
          default: true
        },
        pushNotifications: {
          type: Boolean,
          default: true
        },
        weeklyReport: {
          type: Boolean,
          default: true
        },
        billingAlerts: {
          type: Boolean,
          default: true
        },
        memberInvites: {
          type: Boolean,
          default: true
        },
        securityAlerts: {
          type: Boolean,
          default: true
        },
        pricingChanges: {
          type: Boolean,
          default: true
        },
        lowMargins: {
          type: Boolean,
          default: true
        },
        usageSpikes: {
          type: Boolean,
          default: true
        }
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'light'
      },
      language: {
        type: String,
        default: 'en'
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    refreshTokens: [{
      token: String,
      device: String,
      browser: String,
      os: String,
      ip: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      lastUsed: {
        type: Date,
        default: Date.now
      }
    }],
    backupCodes: [{
      code: String,
      usedAt: Date
    }],
    lastLogin: {
      type: Date,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.twoFactorSecret;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
// Note: unique: true in schema already creates the index on 'email'
userSchema.index({ organization: 1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it's modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);

    // Set passwordChangedAt if password is being changed (not on initial creation)
    if (!this.isNew) {
      this.passwordChangedAt = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    const user = await this.constructor.findById(this._id).select('+password');
    if (!user || !user.password) {
      console.error('[User] Password comparison failed: user or password not found');
      throw new Error('User password not found');
    }
    const isMatch = await bcrypt.compare(candidatePassword, user.password);
    return isMatch;
  } catch (error) {
    console.error('[User] Password comparison error:', error.message);
    throw new Error('Password comparison failed');
  }
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.constructor.findByIdAndUpdate(this._id, {
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if attempts exceed threshold
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return await this.constructor.findByIdAndUpdate(this._id, updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.constructor.findByIdAndUpdate(this._id, {
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1, lastLogin: new Date() }
  });
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

const User = mongoose.model('User', userSchema);

export default User;