/**
 * Email Verification Model
 *
 * MongoDB model for email verification tokens.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const emailVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
// Note: unique: true in schema already creates the index on 'token'
emailVerificationSchema.index({ user: 1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to hash token
emailVerificationSchema.pre('save', function (next) {
  if (this.isNew) {
    // Hash the token before saving
    const plainToken = this.token;
    this.token = crypto.createHash('sha256').update(plainToken).digest('hex');
  }
  next();
});

// Static method to create verification token
emailVerificationSchema.statics.createToken = async function (userId, email) {
  // Generate random token
  const plainToken = crypto.randomBytes(32).toString('hex');

  // Invalidate any existing tokens for this user
  await this.deleteMany({ user: userId });

  // Create verification record
  await this.create({
    user: userId,
    email: email.toLowerCase(),
    token: plainToken // Will be hashed in pre-save
  });

  // Return the plain token
  return plainToken;
};

// Static method to verify token
emailVerificationSchema.statics.verifyToken = async function (token) {
  // Hash the provided token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find the verification record
  const verificationRecord = await this.findOne({
    token: hashedToken,
    verified: false,
    expiresAt: { $gt: new Date() }
  }).populate('user');

  if (!verificationRecord) {
    return null;
  }

  return verificationRecord;
};

// Method to mark as verified
emailVerificationSchema.methods.markAsVerified = function () {
  this.verified = true;
  this.verifiedAt = new Date();
  return this.save();
};

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

export default EmailVerification;