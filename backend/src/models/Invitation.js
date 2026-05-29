/**
 * Invitation Model
 *
 * MongoDB model for team invitations.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role is required']
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    message: {
      type: String,
      maxlength: [500, 'Invitation message cannot exceed 500 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
invitationSchema.index({ organization: 1, email: 1, status: 1 });
// Note: unique: true in schema already creates the index on 'token'
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware
invitationSchema.pre('save', function (next) {
  if (this.isNew) {
    // Hash the token
    const plainToken = this.token || crypto.randomBytes(32).toString('hex');
    this.token = crypto.createHash('sha256').update(plainToken).digest('hex');

    // Set expiration (7 days)
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  next();
});

// Static method to create invitation
invitationSchema.statics.createInvitation = async function (data) {
  const { organizationId, email, roleId, invitedBy, message = '' } = data;

  // Generate plain token
  const plainToken = crypto.randomBytes(32).toString('hex');

  // Create invitation
  const invitation = await this.create({
    organization: organizationId,
    email: email.toLowerCase(),
    role: roleId,
    token: plainToken, // Will be hashed in pre-save
    invitedBy,
    message,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  // Return both invitation and plain token (only time it's available)
  return {
    invitation,
    plainToken
  };
};

// Static method to verify invitation token
invitationSchema.statics.verifyToken = async function (token, email) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const invitation = await this.findOne({
    token: hashedToken,
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('organization').populate('role');

  return invitation;
};

// Static method to find pending invitations for organization
invitationSchema.statics.findPendingByOrganization = function (organizationId) {
  return this.find({
    organization: organizationId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('role').populate('invitedBy', 'firstName lastName email');
};

// Static method to find pending invitations for email
invitationSchema.statics.findPendingByEmail = function (email) {
  return this.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('organization').populate('role');
};

// Static method to cancel invitations
invitationSchema.statics.cancelByOrganization = function (organizationId, email) {
  return this.updateMany(
    { organization: organizationId, email: email.toLowerCase(), status: 'pending' },
    { status: 'cancelled' }
  );
};

// Method to accept invitation
invitationSchema.methods.accept = function () {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
};

// Method to expire invitation
invitationSchema.methods.expire = function () {
  this.status = 'expired';
  return this.save();
};

// Static method to clean expired invitations
invitationSchema.statics.cleanExpired = function () {
  return this.updateMany(
    { status: 'pending', expiresAt: { $lt: new Date() } },
    { status: 'expired' }
  );
};

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;