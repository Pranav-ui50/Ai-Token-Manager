/**
 * Pending Registration Model
 *
 * Stores registration data temporarily until payment is completed.
 * Used for the registration-to-payment flow where account creation
 * happens only after successful payment.
 */

import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema(
  {
    // Personal details
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },

    // Organization details
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },

    // Plan details
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      default: 'free'
    },
    planName: {
      type: String,
      default: null
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },

    // Payment details
    paymentProvider: {
      type: String,
      enum: ['stripe', 'razorpay', 'manual'],
      required: true
    },
    stripeSessionId: {
      type: String,
      default: null
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true
    },

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending',
      index: true
    },

    // Metadata
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },

    // Expiry (24 hours from creation)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: true
    },

    // Reference to created user (after completion)
    createdUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.password; // Never expose password in JSON
        return ret;
      }
    }
  }
);

// Compound indexes
pendingRegistrationSchema.index({ email: 1, status: 1 });
pendingRegistrationSchema.index({ razorpayOrderId: 1 });
pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create pending registration
pendingRegistrationSchema.statics.createPending = async function(data) {
  // Check if there's an existing pending registration for this email
  const existing = await this.findOne({
    email: data.email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  if (existing) {
    // Update the existing one
    existing.set(data);
    existing.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return existing.save();
  }

  // Create new
  return this.create({
    ...data,
    email: data.email.toLowerCase(),
    status: 'pending'
  });
};

// Static method to get pending by Razorpay order ID
pendingRegistrationSchema.statics.getByRazorpayOrderId = async function(orderId) {
  return this.findOne({
    razorpayOrderId: orderId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

// Static method to get pending by Stripe session ID
pendingRegistrationSchema.statics.getByStripeSessionId = async function(sessionId) {
  return this.findOne({
    stripeSessionId: sessionId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

// Static method to mark as completed
pendingRegistrationSchema.statics.markCompleted = async function(id, userId) {
  return this.findByIdAndUpdate(
    id,
    {
      status: 'completed',
      createdUserId: userId
    },
    { new: true }
  );
};

// Static method to mark as cancelled
pendingRegistrationSchema.statics.markCancelled = async function(id) {
  return this.findByIdAndUpdate(
    id,
    { status: 'cancelled' },
    { new: true }
  );
};

// Static method to clean expired
pendingRegistrationSchema.statics.cleanExpired = async function() {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
};

const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);

export default PendingRegistration;