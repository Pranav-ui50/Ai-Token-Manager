/**
 * Password Reset Model
 *
 * MongoDB model for password reset tokens.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import config from '../config/index.js';

const passwordResetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required']
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: {
      type: Date,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
// Note: unique: true in schema already creates the index on 'token'
passwordResetSchema.index({ user: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to hash token
passwordResetSchema.pre('save', function (next) {
  if (this.isNew) {
    // Hash the token before saving
    const plainToken = this.token;
    this.token = crypto.createHash('sha256').update(plainToken).digest('hex');

    // Set expiration date if not set
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + config.password.resetExpires);
    }
  }
  next();
});

// Static method to create reset token
passwordResetSchema.statics.createToken = async function (userId, email, ipAddress = null, userAgent = null) {
  // Generate random token
  const plainToken = crypto.randomBytes(32).toString('hex');

  // Create reset record
  const resetRecord = await this.create({
    user: userId,
    email: email.toLowerCase(),
    token: plainToken, // Will be hashed in pre-save
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + config.password.resetExpires)
  });

  // Return the plain token (only time it's available)
  return plainToken;
};

// Static method to verify token
passwordResetSchema.statics.verifyToken = async function (token, email) {
  // Hash the provided token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find the reset record
  const resetRecord = await this.findOne({
    token: hashedToken,
    email: email.toLowerCase(),
    used: false,
    expiresAt: { $gt: new Date() }
  }).populate('user');

  if (!resetRecord) {
    return null;
  }

  return resetRecord;
};

// Method to mark as used
passwordResetSchema.methods.markAsUsed = function () {
  this.used = true;
  this.usedAt = new Date();
  return this.save();
};

// Static method to clean expired tokens
passwordResetSchema.statics.cleanExpired = function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method to invalidate all user tokens
passwordResetSchema.statics.invalidateUserTokens = function (userId) {
  return this.updateMany(
    { user: userId, used: false },
    { $set: { used: true, usedAt: new Date() } }
  );
};

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;