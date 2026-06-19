/**
 * Organization Model
 *
 * MongoDB model for organizations (workspaces).
 */

import mongoose from 'mongoose';
import { slugify } from '../utils/helpers.js';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    logo: {
      type: String,
      default: null
    },
    website: {
      type: String,
      default: null
    },
    industry: {
      type: String,
      enum: ['technology', 'healthcare', 'finance', 'education', 'retail', 'other', null],
      default: null
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization owner is required']
    },
    members: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'disabled'],
        default: 'active'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      // Fields for member management during plan changes
      previousStatus: {
        type: String,
        enum: ['active', 'inactive', null],
        default: null
      },
      disabledAt: {
        type: Date,
        default: null
      },
      disabledReason: {
        type: String,
        enum: ['plan_limit', 'admin_action', 'subscription_expired', null],
        default: null
      },
      disabledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reamedAt: {
        type: Date,
        default: null
      },
      reenabledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    settings: {
      currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      dateFormat: {
        type: String,
        default: 'MM/DD/YYYY'
      },
      notifications: {
        email: {
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
      }
    },
    subscription: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        default: null
      },
      plan: {
        type: String,
        default: null
      },
      planName: {
        type: String,
        default: null
      },
      status: {
        type: String,
        enum: ['active', 'trial', 'pending_payment', 'past_due', 'expired', 'cancelled', 'grace_period'],
        default: 'trial'
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
      },
      trialEndsAt: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      },
      currentPeriodStart: {
        type: Date,
        default: null
      },
      currentPeriodEnd: {
        type: Date,
        default: null
      },
      // Stripe fields
      stripeCustomerId: {
        type: String,
        default: null
      },
      stripeSubscriptionId: {
        type: String,
        default: null
      },
      stripePaymentIntentId: {
        type: String,
        default: null
      },
      // Razorpay fields
      razorpayCustomerId: {
        type: String,
        default: null
      },
      razorpaySubscriptionId: {
        type: String,
        default: null
      },
      razorpayOrderId: {
        type: String,
        default: null
      },
      razorpayPaymentId: {
        type: String,
        default: null
      },
      cancelReason: {
        type: String,
        default: null
      },
      cancelledAt: {
        type: Date,
        default: null
      },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      reactivatedAt: {
        type: Date,
        default: null
      },
      reactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      updatedAt: {
        type: Date,
        default: Date.now
      },
      previousPlan: {
        type: String,
        default: null
      },
      expiredAt: {
        type: Date,
        default: null
      }
    },
    // Scheduled downgrade information
    scheduledDowngrade: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
      },
      planTier: {
        type: String,
        default: null
      },
      scheduledAt: {
        type: Date,
        default: null
      },
      effectiveAt: {
        type: Date,
        default: null
      },
      scheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    billingDetails: {
      companyName: {
        type: String,
        default: ''
      },
      address: {
        type: String,
        default: ''
      },
      city: {
        type: String,
        default: ''
      },
      state: {
        type: String,
        default: ''
      },
      country: {
        type: String,
        default: ''
      },
      postalCode: {
        type: String,
        default: ''
      },
      taxId: {
        type: String,
        default: ''
      },
      vatNumber: {
        type: String,
        default: ''
      }
    },
    paymentMethods: [{
      id: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['card', 'bank_account'],
        default: 'card'
      },
      last4: {
        type: String,
        required: true
      },
      brand: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
        default: 'other'
      },
      expiryMonth: {
        type: Number,
        default: null
      },
      expiryYear: {
        type: Number,
        default: null
      },
      externalId: {
        type: String,
        default: null
      },
      provider: {
        type: String,
        enum: ['stripe', 'razorpay', 'manual'],
        default: 'stripe'
      },
      isDefault: {
        type: Boolean,
        default: false
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isActive: {
      type: Boolean,
      default: true
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
// Note: unique: true in schema already creates the index on 'slug'
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'members.user': 1 });

// Virtual for member count
organizationSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

// Virtual for project count
organizationSchema.virtual('projectCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'organization',
  count: true
});

// Pre-save middleware to generate slug
organizationSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('name')) {
    // Generate slug from name
    let slug = slugify(this.name);

    // Check if slug exists
    const existingOrg = await this.constructor.findOne({ slug });

    if (existingOrg && existingOrg._id.toString() !== this._id.toString()) {
      // Append random string if slug exists
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    this.slug = slug;
  }

  next();
});

// Static method to find by slug
organizationSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase(), isActive: true });
};

// Static method to find by owner
organizationSchema.statics.findByOwner = function (ownerId) {
  return this.find({ owner: ownerId, isActive: true });
};

// Static method to find by member
organizationSchema.statics.findByMember = function (userId) {
  return this.find({
    'members.user': userId,
    isActive: true
  });
};

// Method to check if user is member (includes owner)
organizationSchema.methods.isMember = function (userId) {
  // Check if user is the owner first
  if (this.owner && this.owner.toString() === userId.toString()) {
    return true;
  }
  // Then check members array
  return this.members.some(member => {
    // Handle both populated and unpopulated user
    const memberId = member.user?._id ? member.user._id.toString() : member.user?.toString();
    return memberId === userId.toString();
  });
};

// Method to check if user is owner
organizationSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

// Method to check if user is admin (has admin role or is owner)
organizationSchema.methods.isAdmin = function (userId) {
  // Owner is always admin
  if (this.isOwner(userId)) {
    return true;
  }

  // Check if user has admin role
  const member = this.members.find(m => {
    const memberId = m.user?._id ? m.user._id.toString() : m.user?.toString();
    return memberId === userId.toString();
  });

  if (!member) {
    return false;
  }

  // Check if role is admin-level (handle both populated and unpopulated role)
  const roleName = member.role?.name?.toLowerCase() ||
                   (typeof member.role === 'object' ? member.role.name?.toLowerCase() : null);

  // Admin roles include: super_admin, org_owner, finance_admin
  // These roles have elevated permissions to manage projects
  const adminRoles = ['super_admin', 'org_owner', 'finance_admin'];
  return adminRoles.includes(roleName);
};

// Method to get member role
organizationSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to add member
organizationSchema.methods.addMember = function (userId, roleId, invitedBy = null) {
  // Check if already a member
  if (this.isMember(userId)) {
    return false;
  }

  this.members.push({
    user: userId,
    role: roleId,
    status: 'active',
    invitedBy: invitedBy,
    joinedAt: new Date()
  });

  return true;
};

// Method to remove member
organizationSchema.methods.removeMember = function (userId) {
  const index = this.members.findIndex(m => m.user.toString() === userId.toString());

  if (index === -1) {
    return false;
  }

  this.members.splice(index, 1);
  return true;
};

// Method to update member role
organizationSchema.methods.updateMemberRole = function (userId, newRoleId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());

  if (!member) {
    return false;
  }

  member.role = newRoleId;
  return true;
};

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
