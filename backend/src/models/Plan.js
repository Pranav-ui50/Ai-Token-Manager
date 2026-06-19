/**
 * Plan Model
 *
 * Represents a subscription plan with features and pricing.
 * Includes profitability calculations based on AI token costs.
 */

import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  // Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Plan identification
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Plan tier
  tier: {
    type: String,
    enum: ['starter', 'professional', 'business'],
    default: 'starter'
  },

  // Billing
  billing: {
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: [0, 'Price cannot be negative']
    },
    yearlyPrice: {
      type: Number,
      min: [0, 'Yearly price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    interval: {
      type: String,
      enum: ['month', 'year', 'one-time'],
      default: 'month'
    },
    trialDays: {
      type: Number,
      default: 0,
      min: [0, 'Trial days cannot be negative']
    }
  },

  // Pricing Model (FR-31: Usage-based Pricing)
  pricingModel: {
    type: {
      type: String,
      enum: ['flat', 'usage-based', 'tiered', 'hybrid'],
      default: 'flat'
    },
    // For usage-based pricing
    usageBased: {
      pricePerToken: {
        type: Number,
        default: 0
      },
      pricePerRequest: {
        type: Number,
        default: 0
      },
      includedTokens: {
        type: Number,
        default: 0 // Tokens included in base price
      },
      includedRequests: {
        type: Number,
        default: 0 // Requests included in base price
      },
      // Overage pricing
      overageMultiplier: {
        type: Number,
        default: 1 // Multiplier for usage beyond included amount
      }
    },
    // For tiered pricing
    tiers: [{
      from: {
        type: Number,
        required: true
      },
      to: {
        type: Number // null for unlimited
      },
      pricePerUnit: {
        type: Number,
        required: true
      },
      unitType: {
        type: String,
        enum: ['token', 'request', 'user'],
        default: 'token'
      }
    }]
  },

  // Credit-based System (FR-32: Credit System)
  credits: {
    // Credits included with plan
    includedCredits: {
      type: Number,
      default: 0
    },
    // Credit type
    creditType: {
      type: String,
      enum: ['token', 'request', 'point'],
      default: 'token'
    },
    // Allow rollover to next billing period
    rollover: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxRolloverPercent: {
        type: Number,
        default: 0,
        min: [0, 'Rollover percent cannot be negative'],
        max: [100, 'Rollover percent cannot exceed 100']
      },
      expirationMonths: {
        type: Number,
        default: 3
      }
    },
    // Credit pricing (for additional credits)
    creditPricing: {
      pricePerCredit: {
        type: Number,
        default: 0
      },
      // Bulk discounts
      bulkDiscounts: [{
        minQuantity: {
          type: Number,
          required: true
        },
        discountPercent: {
          type: Number,
          required: true
        }
      }],
      // Credit packs
      creditPacks: [{
        name: {
          type: String,
          required: true
        },
        credits: {
          type: Number,
          required: true
        },
        price: {
          type: Number,
          required: true
        }
      }]
    },
    // Auto-recharge settings
    autoRecharge: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 100 // Recharge when credits fall below this
      },
      rechargeAmount: {
        type: Number,
        default: 500 // Amount to add on recharge
      }
    }
  },

  // Features included in this plan
  features: [{
    feature: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature',
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    // Usage limits for this feature in this plan
    limits: {
      maxRequests: {
        type: Number,
        default: null // null means unlimited
      },
      maxTokens: {
        type: Number,
        default: null
      },
      // Custom multiplier for this feature in this plan
      multiplier: {
        type: Number,
        default: 1
      }
    }
  }],

  // Plan-level usage limits
  limits: {
    maxProjects: {
      type: Number,
      default: null // null means unlimited
    },
    maxFeatures: {
      type: Number,
      default: null
    },
    maxSimulations: {
      type: Number,
      default: null
    },
    maxUsers: {
      type: Number,
      default: null // null means unlimited
    },
    maxApiCalls: {
      type: Number,
      default: null
    },
    maxTokens: {
      type: Number,
      default: null
    },
    maxStorage: {
      type: Number,
      default: null // in MB
    }
  },

  // Cost analysis
  costs: {
    // Estimated AI token cost per user per billing period
    estimatedTokenCostPerUser: {
      type: Number,
      default: 0
    },
    // Fixed costs (infrastructure, support, etc.)
    fixedCostsPerMonth: {
      type: Number,
      default: 0
    },
    // Variable cost percentage (payment processing, etc.)
    variableCostPercentage: {
      type: Number,
      default: 2.9 // ~Stripe percentage
    },
    // Last calculated total cost
    calculatedCost: {
      type: Number,
      default: 0
    },
    // Calculated at
    calculatedAt: {
      type: Date
    }
  },

  // Profit analysis
  profitability: {
    // Gross margin percentage
    grossMargin: {
      type: Number,
      default: 0
    },
    // Break-even users (number of users needed to cover costs)
    breakEvenUsers: {
      type: Number,
      default: 0
    },
    // Profit per user
    profitPerUser: {
      type: Number,
      default: 0
    },
    // Last calculated
    calculatedAt: {
      type: Date
    }
  },

  // Plan settings
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    allowUpgrade: {
      type: Boolean,
      default: true
    },
    allowDowngrade: {
      type: Boolean,
      default: true
    },
    maxDowngradeInterval: {
      type: Number, // in days
      default: 30
    }
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'deprecated'],
    default: 'draft'
  },

  // Display order
  displayOrder: {
    type: Number,
    default: 0
  },

  // Popular/recommended badge
  isPopular: {
    type: Boolean,
    default: false
  },

  // Discount/promotion
  discount: {
    percentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    validFrom: {
      type: Date
    },
    validUntil: {
      type: Date
    }
  },

  // Metadata
  metadata: {
    tags: [{
      type: String,
      trim: true
    }],
    notes: {
      type: String,
      trim: true
    }
  },

  // Usage statistics (denormalized)
  stats: {
    totalSubscribers: {
      type: Number,
      default: 0
    },
    activeSubscribers: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    mrr: {
      type: Number, // Monthly Recurring Revenue
      default: 0
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  strict: true, // Ensure only defined fields are saved
  minimize: false // Ensure empty objects are saved
});

// Pre-save hook to debug limits
planSchema.pre('save', function(next) {
  console.log('[DEBUG Plan Schema] ====== PRE-SAVE HOOK ======');
  console.log('[DEBUG Plan Schema] Document _id:', this._id);
  console.log('[DEBUG Plan Schema] Is new document?:', this.isNew);
  console.log('[DEBUG Plan Schema] Modified paths:', this.modifiedPaths());
  console.log('[DEBUG Plan Schema] limits object:', JSON.stringify(this.limits, null, 2));
  console.log('[DEBUG Plan Schema] limits.maxProjects:', this.limits?.maxProjects, '(type:', typeof this.limits?.maxProjects, ')');
  console.log('[DEBUG Plan Schema] limits.maxFeatures:', this.limits?.maxFeatures, '(type:', typeof this.limits?.maxFeatures, ')');
  console.log('[DEBUG Plan Schema] limits.maxSimulations:', this.limits?.maxSimulations, '(type:', typeof this.limits?.maxSimulations, ')');
  console.log('[DEBUG Plan Schema] limits.maxUsers:', this.limits?.maxUsers, '(type:', typeof this.limits?.maxUsers, ')');
  console.log('[DEBUG Plan Schema] limits.maxApiCalls:', this.limits?.maxApiCalls, '(type:', typeof this.limits?.maxApiCalls, ')');
  console.log('[DEBUG Plan Schema] limits.maxTokens:', this.limits?.maxTokens, '(type:', typeof this.limits?.maxTokens, ')');
  console.log('[DEBUG Plan Schema] ============================');
  next();
});

// Post-save hook to verify data was saved
planSchema.post('save', function(doc, next) {
  console.log('[DEBUG Plan Schema] ====== POST-SAVE HOOK ======');
  console.log('[DEBUG Plan Schema] Document saved with _id:', doc._id);
  console.log('[DEBUG Plan Schema] Saved limits:', JSON.stringify(doc.limits, null, 2));
  console.log('[DEBUG Plan Schema] Saved limits.maxProjects:', doc.limits?.maxProjects);
  console.log('[DEBUG Plan Schema] Saved limits.maxFeatures:', doc.limits?.maxFeatures);
  console.log('[DEBUG Plan Schema] Saved limits.maxSimulations:', doc.limits?.maxSimulations);
  console.log('[DEBUG Plan Schema] =============================');
  next();
});

// Indexes
planSchema.index({ organization: 1, slug: 1 }, { unique: true });
planSchema.index({ organization: 1, tier: 1 });
planSchema.index({ organization: 1, status: 1 });
planSchema.index({ organization: 1, 'settings.isDefault': 1 });
planSchema.index({ tier: 1, status: 1 });

// Virtual for effective price (after discount)
planSchema.virtual('effectivePrice').get(function() {
  if (this.discount.percentage > 0) {
    const now = new Date();
    if ((!this.discount.validFrom || now >= this.discount.validFrom) &&
        (!this.discount.validUntil || now <= this.discount.validUntil)) {
      return this.billing.price * (1 - this.discount.percentage / 100);
    }
  }
  return this.billing.price;
});

// Virtual for annual price
planSchema.virtual('annualPrice').get(function() {
  if (this.billing.interval === 'month') {
    return this.billing.price * 12;
  }
  return this.billing.price;
});

// Virtual for monthly equivalent
planSchema.virtual('monthlyEquivalent').get(function() {
  if (this.billing.interval === 'year') {
    return this.billing.price / 12;
  }
  return this.billing.price;
});

// Virtual for credit value (FR-32)
planSchema.virtual('creditValue').get(function() {
  if (this.credits.includedCredits > 0 && this.billing.price > 0) {
    return this.billing.price / this.credits.includedCredits;
  }
  return 0;
});

// Virtual for usage-based pricing type
planSchema.virtual('isUsageBased').get(function() {
  return this.pricingModel.type === 'usage-based' || this.pricingModel.type === 'tiered';
});

// Virtual for credit-based pricing
planSchema.virtual('isCreditBased').get(function() {
  return this.credits.includedCredits > 0;
});

// Pre-save middleware to generate slug
planSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save middleware to set default plan
planSchema.pre('save', async function(next) {
  if (this.settings.isDefault && this.isModified('settings.isDefault')) {
    // Remove default from other plans
    await this.constructor.updateMany(
      { organization: this.organization, _id: { $ne: this._id } },
      { 'settings.isDefault': false }
    );
  }
  next();
});

// Static method to get plans by organization
planSchema.statics.findByOrganization = function(organizationId, filters = {}) {
  return this.find({ organization: organizationId, ...filters })
    .populate('features.feature', 'name slug category tokenEstimates')
    .sort({ displayOrder: 1, createdAt: -1 });
};

// Static method to get active public plans
planSchema.statics.findActive = function(organizationId) {
  return this.find({
    organization: organizationId,
    status: 'active',
    'settings.isPublic': true
  })
    .populate('features.feature', 'name slug category')
    .sort({ displayOrder: 1 });
};

// Static method to get default plan
planSchema.statics.findDefault = function(organizationId) {
  return this.findOne({
    organization: organizationId,
    'settings.isDefault': true,
    status: 'active'
  }).populate('features.feature');
};

// Instance method to calculate profitability
planSchema.methods.calculateProfitability = async function() {
  // Calculate estimated costs
  let totalTokenCost = 0;

  if (this.features && this.features.length > 0) {
    for (const featureConfig of this.features) {
      if (featureConfig.enabled && featureConfig.feature) {
        // Populate feature if not already populated
        if (typeof featureConfig.feature === 'string') {
          await this.populate('features.feature');
        }

        const feature = featureConfig.feature;
        if (feature && feature.tokenEstimates) {
          // Estimate cost per request
          const requestsPerUserPerMonth = 100; // Default estimate
          const inputCost = (feature.tokenEstimates.inputTokensPerRequest || 0) * requestsPerUserPerMonth * 0.00001;
          const outputCost = (feature.tokenEstimates.outputTokensPerRequest || 0) * requestsPerUserPerMonth * 0.00003;
          totalTokenCost += (inputCost + outputCost) * (featureConfig.limits.multiplier || 1);
        }
      }
    }
  }

  // Add fixed costs
  const fixedCosts = this.costs.fixedCostsPerMonth || 0;

  // Calculate variable costs (payment processing)
  const price = this.billing.price;
  const variableCost = (price * (this.costs.variableCostPercentage || 2.9)) / 100;

  // Total cost per user
  const costPerUser = totalTokenCost + (fixedCosts / Math.max(this.stats.activeSubscribers || 1, 1));
  this.costs.estimatedTokenCostPerUser = totalTokenCost;
  this.costs.calculatedCost = costPerUser;
  this.costs.calculatedAt = new Date();

  // Calculate profitability
  const profitPerUser = price - costPerUser - variableCost;
  this.profitability.profitPerUser = profitPerUser;
  this.profitability.grossMargin = price > 0 ? ((profitPerUser / price) * 100) : 0;

  // Break-even calculation
  if (profitPerUser > 0) {
    this.profitability.breakEvenUsers = Math.ceil(fixedCosts / profitPerUser);
  } else {
    this.profitability.breakEvenUsers = 0;
  }

  this.profitability.calculatedAt = new Date();

  return this.save();
};

// Instance method to check if feature is included
planSchema.methods.hasFeature = function(featureId) {
  return this.features.some(f =>
    f.feature.toString() === featureId.toString() && f.enabled
  );
};

// Instance method to get feature limits
planSchema.methods.getFeatureLimits = function(featureId) {
  const featureConfig = this.features.find(f =>
    f.feature.toString() === featureId.toString()
  );
  return featureConfig?.limits || null;
};

// Instance method to calculate usage-based cost (FR-31)
planSchema.methods.calculateUsageCost = function(tokens, requests) {
  if (this.pricingModel.type === 'flat') {
    return 0; // No additional cost for flat pricing
  }

  let totalCost = 0;

  if (this.pricingModel.type === 'usage-based') {
    const usage = this.pricingModel.usageBased;
    const includedTokens = usage.includedTokens || 0;
    const includedRequests = usage.includedRequests || 0;

    // Calculate overage
    const tokenOverage = Math.max(0, (tokens || 0) - includedTokens);
    const requestOverage = Math.max(0, (requests || 0) - includedRequests);

    totalCost = (tokenOverage * usage.pricePerToken * usage.overageMultiplier) +
                (requestOverage * usage.pricePerRequest * usage.overageMultiplier);
  } else if (this.pricingModel.type === 'tiered') {
    // Calculate tiered pricing
    for (const tier of this.pricingModel.tiers) {
      if (tokens >= tier.from) {
        const tierUsage = tier.to ? Math.min(tokens, tier.to) - tier.from : tokens - tier.from;
        totalCost += Math.max(0, tierUsage) * tier.pricePerUnit;
      }
    }
  }

  return totalCost;
};

// Instance method to calculate credit purchase cost (FR-32)
planSchema.methods.calculateCreditPurchaseCost = function(credits) {
  const creditPricing = this.credits.creditPricing;

  if (!creditPricing.pricePerCredit || credits <= 0) {
    return 0;
  }

  // Check for bulk discounts
  let discountPercent = 0;
  if (creditPricing.bulkDiscounts && creditPricing.bulkDiscounts.length > 0) {
    const applicableDiscount = creditPricing.bulkDiscounts
      .filter(d => credits >= d.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (applicableDiscount) {
      discountPercent = applicableDiscount.discountPercent;
    }
  }

  const baseCost = credits * creditPricing.pricePerCredit;
  return baseCost * (1 - discountPercent / 100);
};

// Instance method to get rollover credits (FR-32)
planSchema.methods.calculateRolloverCredits = function(unusedCredits) {
  const rollover = this.credits.rollover;

  if (!rollover.enabled) {
    return 0;
  }

  const maxRollover = this.credits.includedCredits * (rollover.maxRolloverPercent / 100);
  return Math.min(unusedCredits, maxRollover);
};

// Instance method to check if auto-recharge is triggered
planSchema.methods.shouldAutoRecharge = function(currentCredits) {
  const autoRecharge = this.credits.autoRecharge;

  if (!autoRecharge.enabled) {
    return false;
  }

  return currentCredits <= autoRecharge.threshold;
};

// Instance method to get credit pack by name
planSchema.methods.getCreditPack = function(packName) {
  return this.credits.creditPricing.creditPacks.find(pack => pack.name === packName);
};

const Plan = mongoose.model('Plan', planSchema);

export default Plan;