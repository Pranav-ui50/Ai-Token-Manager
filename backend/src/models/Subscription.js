/**
 * Subscription Model
 *
 * Manages user subscriptions to plans with credit tracking.
 */

import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  // User and Organization
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Plan
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },

  // Subscription Status
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid', 'paused'],
    default: 'active',
    index: true
  },

  // Billing Period
  billing: {
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'one-time'],
      default: 'monthly'
    },
    nextBillingDate: {
      type: Date
    },
    lastPaymentDate: {
      type: Date
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'credits', 'other'],
      default: 'card'
    }
  },

  // Credit Balance (FR-32: Credit System)
  credits: {
    // Current credit balance
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Credit balance cannot be negative']
    },
    // Credits included in plan
    includedCredits: {
      type: Number,
      default: 0
    },
    // Rollover credits from previous period
    rolloverCredits: {
      type: Number,
      default: 0
    },
    // Purchased credits (additional)
    purchasedCredits: {
      type: Number,
      default: 0
    },
    // Credits used this period
    usedThisPeriod: {
      type: Number,
      default: 0
    },
    // Credit history
    history: [{
      date: {
        type: Date,
        default: Date.now
      },
      type: {
        type: String,
        enum: ['allocation', 'purchase', 'usage', 'refund', 'rollover', 'adjustment', 'expiration'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      balance: {
        type: Number,
        required: true
      },
      description: {
        type: String
      },
      reference: {
        type: String // Reference to transaction, usage record, etc.
      }
    }],
    // Auto-recharge settings
    autoRecharge: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 100
      },
      rechargeAmount: {
        type: Number,
        default: 500
      },
      lastRecharge: {
        type: Date
      }
    },
    // Credit expiration
    creditExpiration: {
      enabled: {
        type: Boolean,
        default: false
      },
      expirationMonths: {
        type: Number,
        default: 12
      }
    }
  },

  // Usage Tracking
  usage: {
    tokensUsed: {
      type: Number,
      default: 0
    },
    requestsUsed: {
      type: Number,
      default: 0
    },
    featuresUsed: [{
      feature: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feature'
      },
      requests: {
        type: Number,
        default: 0
      },
      tokens: {
        type: Number,
        default: 0
      },
      lastUsed: {
        type: Date
      }
    }],
    // Usage history for analytics
    dailyUsage: [{
      date: {
        type: Date,
        required: true
      },
      tokens: {
        type: Number,
        default: 0
      },
      requests: {
        type: Number,
        default: 0
      },
      credits: {
        type: Number,
        default: 0
      }
    }]
  },

  // Trial Information
  trial: {
    isTrialing: {
      type: Boolean,
      default: false
    },
    trialStart: {
      type: Date
    },
    trialEnd: {
      type: Date
    },
    trialCredits: {
      type: Number,
      default: 0
    }
  },

  // Cancellation
  cancellation: {
    canceledAt: {
      type: Date
    },
    canceledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    },
    feedback: {
      type: String
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    }
  },

  // Payment Information
  payment: {
    stripeSubscriptionId: {
      type: String,
      index: true
    },
    stripeCustomerId: {
      type: String,
      index: true
    },
    lastPaymentAmount: {
      type: Number
    },
    lastPaymentStatus: {
      type: String,
      enum: ['succeeded', 'failed', 'pending', 'refunded']
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'api', 'admin', 'import'],
      default: 'web'
    },
    notes: {
      type: String
    },
    customData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subscriptionSchema.index({ organization: 1, user: 1 });
subscriptionSchema.index({ organization: 1, status: 1 });
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ 'billing.currentPeriodEnd': 1 });
subscriptionSchema.index({ 'payment.stripeSubscriptionId': 1 });

// Virtual for total available credits
subscriptionSchema.virtual('totalCredits').get(function() {
  return this.credits.balance + this.credits.rolloverCredits + this.credits.purchasedCredits;
});

// Virtual for remaining credits
subscriptionSchema.virtual('remainingCredits').get(function() {
  return Math.max(0, this.credits.balance - this.credits.usedThisPeriod);
});

// Virtual for percentage of credits used
subscriptionSchema.virtual('creditUsagePercent').get(function() {
  if (this.credits.balance === 0) return 0;
  return Math.min(100, (this.credits.usedThisPeriod / this.credits.balance) * 100);
});

// Virtual for days remaining in billing period
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.billing.currentPeriodEnd) return 0;
  const remaining = Math.ceil((this.billing.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, remaining);
});

// Virtual for is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trialing';
});

// Static method to find active subscription for user
subscriptionSchema.statics.findActiveForUser = function(userId) {
  return this.findOne({
    user: userId,
    status: { $in: ['active', 'trialing'] }
  }).populate('plan');
};

// Static method to find subscriptions by organization
subscriptionSchema.statics.findByOrganization = function(organizationId, filters = {}) {
  return this.find({
    organization: organizationId,
    ...filters
  }).populate('plan user');
};

// Static method to get expiring subscriptions
subscriptionSchema.statics.getExpiringSubscriptions = function(daysFromNow = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysFromNow);

  return this.find({
    status: 'active',
    'billing.currentPeriodEnd': { $lte: expiryDate }
  }).populate('plan user organization');
};

// Instance method to add credits
subscriptionSchema.methods.addCredits = function(amount, type = 'purchase', description = '', reference = '') {
  this.credits.balance += amount;

  // Update purchased credits if it's a purchase
  if (type === 'purchase') {
    this.credits.purchasedCredits += amount;
  }

  // Add to history
  this.credits.history.push({
    date: new Date(),
    type,
    amount,
    balance: this.credits.balance,
    description,
    reference
  });

  return this.save();
};

// Instance method to use credits
subscriptionSchema.methods.useCredits = function(amount, description = '', reference = '') {
  if (this.credits.balance < amount) {
    return { success: false, error: 'Insufficient credits' };
  }

  this.credits.balance -= amount;
  this.credits.usedThisPeriod += amount;

  // Add to history
  this.credits.history.push({
    date: new Date(),
    type: 'usage',
    amount: -amount,
    balance: this.credits.balance,
    description,
    reference
  });

  return { success: true, newBalance: this.credits.balance };
};

// Instance method to allocate plan credits
subscriptionSchema.methods.allocatePlanCredits = function(planCredits) {
  this.credits.includedCredits = planCredits;
  this.credits.balance = planCredits;

  this.credits.history.push({
    date: new Date(),
    type: 'allocation',
    amount: planCredits,
    balance: this.credits.balance,
    description: 'Monthly credit allocation'
  });

  return this.save();
};

// Instance method to process rollover
subscriptionSchema.methods.processRollover = function(maxRolloverPercent) {
  const unusedCredits = this.credits.includedCredits - this.credits.usedThisPeriod;

  if (unusedCredits > 0 && maxRolloverPercent > 0) {
    const maxRollover = this.credits.includedCredits * (maxRolloverPercent / 100);
    const rolloverAmount = Math.min(unusedCredits, maxRollover);

    this.credits.rolloverCredits = rolloverAmount;

    this.credits.history.push({
      date: new Date(),
      type: 'rollover',
      amount: rolloverAmount,
      balance: this.credits.balance + rolloverAmount,
      description: 'Credit rollover from previous period'
    });
  }

  return this.save();
};

// Instance method to check auto-recharge
subscriptionSchema.methods.checkAutoRecharge = function() {
  if (!this.credits.autoRecharge.enabled) {
    return { needsRecharge: false };
  }

  const needsRecharge = this.credits.balance <= this.credits.autoRecharge.threshold;

  return {
    needsRecharge,
    threshold: this.credits.autoRecharge.threshold,
    rechargeAmount: this.credits.autoRecharge.rechargeAmount,
    currentBalance: this.credits.balance
  };
};

// Instance method to record usage
subscriptionSchema.methods.recordUsage = function(tokens, requests, featureId = null) {
  this.usage.tokensUsed += tokens;
  this.usage.requestsUsed += requests;

  // Record feature usage if provided
  if (featureId) {
    const featureUsage = this.usage.featuresUsed.find(f => f.feature.toString() === featureId.toString());
    if (featureUsage) {
      featureUsage.requests += requests;
      featureUsage.tokens += tokens;
      featureUsage.lastUsed = new Date();
    } else {
      this.usage.featuresUsed.push({
        feature: featureId,
        requests,
        tokens,
        lastUsed: new Date()
      });
    }
  }

  // Record daily usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyUsage = this.usage.dailyUsage.find(u => {
    const usageDate = new Date(u.date);
    usageDate.setHours(0, 0, 0, 0);
    return usageDate.getTime() === today.getTime();
  });

  if (dailyUsage) {
    dailyUsage.tokens += tokens;
    dailyUsage.requests += requests;
  } else {
    this.usage.dailyUsage.push({
      date: today,
      tokens,
      requests
    });
  }

  // Keep only last 90 days of daily usage
  if (this.usage.dailyUsage.length > 90) {
    this.usage.dailyUsage = this.usage.dailyUsage.slice(-90);
  }

  return this.save();
};

// Instance method to renew subscription period
subscriptionSchema.methods.renewPeriod = function() {
  const periodStart = new Date();
  let periodEnd = new Date();

  if (this.billing.billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else if (this.billing.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  // Process rollover before resetting
  this.processRollover(this.plan?.credits?.rollover?.maxRolloverPercent || 0);

  // Reset usage for new period
  this.usage.tokensUsed = 0;
  this.usage.requestsUsed = 0;
  this.credits.usedThisPeriod = 0;

  // Allocate new credits
  const planCredits = this.plan?.credits?.includedCredits || 0;
  this.allocatePlanCredits(planCredits);

  // Update billing period
  this.billing.currentPeriodStart = periodStart;
  this.billing.currentPeriodEnd = periodEnd;
  this.billing.nextBillingDate = periodEnd;
  this.billing.lastPaymentDate = new Date();

  return this.save();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;