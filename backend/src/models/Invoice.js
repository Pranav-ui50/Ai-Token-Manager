/**
 * Invoice Model
 *
 * MongoDB model for billing invoices.
 * Supports both Stripe and Razorpay invoice tracking.
 */

import mongoose from 'mongoose';

const INVOICE_STATUS = ['draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled'];
const PAYMENT_PROVIDERS = ['stripe', 'razorpay', 'manual'];
const INVOICE_TYPES = ['subscription', 'usage', 'one_time', 'credit_purchase'];

const invoiceSchema = new mongoose.Schema(
  {
    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },

    // Invoice identification
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true
    },
    externalInvoiceId: {
      type: String // Stripe/Razorpay invoice ID
    },

    // Invoice type
    type: {
      type: String,
      enum: INVOICE_TYPES,
      default: 'subscription'
    },

    // Billing period
    billingPeriod: {
      start: {
        type: Date,
        required: true
      },
      end: {
        type: Date,
        required: true
      }
    },

    // Line items
    items: [{
      description: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['subscription', 'usage', 'overage', 'credit', 'discount', 'tax'],
        default: 'subscription'
      },
      quantity: {
        type: Number,
        default: 1
      },
      unitPrice: {
        type: Number,
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
      }
    }],

    // Amount breakdown
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    discountCode: {
      type: String,
      default: null
    },
    tax: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 0
    },
    taxId: {
      type: String,
      default: null
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },

    // Status
    status: {
      type: String,
      enum: INVOICE_STATUS,
      default: 'pending',
      index: true
    },

    // Payment information
    payment: {
      provider: {
        type: String,
        enum: PAYMENT_PROVIDERS
      },
      externalPaymentId: {
        type: String // Stripe PaymentIntent ID or Razorpay Payment ID
      },
      externalCustomerId: {
        type: String // Stripe Customer ID or Razorpay Customer ID
      },
      paymentMethod: {
        type: {
          type: String,
          enum: ['card', 'bank_transfer', 'upi', 'wallet', 'other']
        },
        last4: String,
        brand: String,
        bank: String
      },
      paidAt: {
        type: Date
      },
      failedAt: {
        type: Date
      },
      failureReason: {
        type: String
      },
      refundedAt: {
        type: Date
      },
      refundAmount: {
        type: Number,
        default: 0
      }
    },

    // Due date
    dueDate: {
      type: Date,
      required: true
    },

    // Subscription reference
    subscription: {
      planId: {
        type: String
      },
      planName: {
        type: String
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly']
      }
    },

    // Usage summary (for usage-based billing)
    usage: {
      apiCalls: {
        type: Number,
        default: 0
      },
      tokens: {
        input: { type: Number, default: 0 },
        output: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
      },
      storage: {
        type: Number,
        default: 0
      }
    },

    // Billing details snapshot (at time of invoice)
    billingAddress: {
      companyName: String,
      address: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      taxId: String,
      vatNumber: String
    },

    // Notes
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },

    // Internal notes (not shown to customer)
    internalNotes: {
      type: String
    },

    // Webhook events
    webhookEvents: [{
      provider: String,
      eventType: String,
      eventId: String,
      receivedAt: {
        type: Date,
        default: Date.now
      },
      processed: {
        type: Boolean,
        default: false
      }
    }],

    // Reminders sent
    remindersSent: {
      type: Number,
      default: 0
    },
    lastReminderAt: {
      type: Date
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: {
      type: Date
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelReason: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.internalNotes;
        return ret;
      }
    }
  }
);

// Indexes
invoiceSchema.index({ organization: 1, createdAt: -1 });
invoiceSchema.index({ organization: 1, status: 1 });
invoiceSchema.index({ organization: 1, invoiceNumber: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ 'payment.externalPaymentId': 1 });
invoiceSchema.index({ externalInvoiceId: 1 }); // External invoice ID index for payment provider lookups

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function () {
  if (this.status !== 'pending') return 0;
  const now = new Date();
  if (now <= this.dueDate) return 0;
  return Math.floor((now - this.dueDate) / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
invoiceSchema.virtual('isOverdue').get(function () {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function (organizationId) {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Get count of invoices for this organization this month
  const startOfMonth = new Date(year, new Date().getMonth(), 1);
  const count = await this.countDocuments({
    organization: organizationId,
    createdAt: { $gte: startOfMonth }
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}${month}-${sequence}`;
};

// Static method to find by organization
invoiceSchema.statics.findByOrganization = function (organizationId, options = {}) {
  const query = { organization: organizationId };

  if (options.status) query.status = options.status;
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
  }

  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .skip((options.page - 1) * (options.limit || 20))
    .limit(options.limit || 20)
    .populate('createdBy', 'firstName lastName email');
};

// Static method to get overdue invoices
invoiceSchema.statics.findOverdue = function (organizationId = null) {
  const query = {
    status: 'pending',
    dueDate: { $lt: new Date() }
  };

  if (organizationId) {
    query.organization = organizationId;
  }

  return this.find(query).sort({ dueDate: 1 });
};

// Static method to get revenue statistics
invoiceSchema.statics.getRevenueStats = async function (organizationId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        organization: mongoose.Types.ObjectId.createFromHexString(organizationId),
        status: 'paid',
        paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalInvoices: { $sum: 1 },
        averageInvoice: { $avg: '$total' },
        byCurrency: {
          $push: {
            currency: '$currency',
            total: '$total'
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalRevenue: 0,
    totalInvoices: 0,
    averageInvoice: 0,
    byCurrency: []
  };
};

// Instance method to mark as paid
invoiceSchema.methods.markAsPaid = async function (paymentData) {
  this.status = 'paid';
  this.payment = {
    ...this.payment.toObject(),
    ...paymentData,
    paidAt: new Date()
  };
  return this.save();
};

// Instance method to mark as failed
invoiceSchema.methods.markAsFailed = async function (reason) {
  this.status = 'failed';
  this.payment = {
    ...this.payment.toObject(),
    failedAt: new Date(),
    failureReason: reason
  };
  return this.save();
};

// Instance method to refund
invoiceSchema.methods.refund = async function (amount, reason = null) {
  this.status = 'refunded';
  this.payment = {
    ...this.payment.toObject(),
    refundedAt: new Date(),
    refundAmount: amount || this.total
  };
  if (reason) {
    this.notes = reason;
  }
  return this.save();
};

// Instance method to cancel
invoiceSchema.methods.cancelInvoice = async function (userId, reason = null) {
  if (this.status !== 'pending' && this.status !== 'draft') {
    throw new Error('Only pending or draft invoices can be cancelled');
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancelReason = reason;
  return this.save();
};

// Instance method to add webhook event
invoiceSchema.methods.addWebhookEvent = function (provider, eventType, eventId) {
  this.webhookEvents.push({
    provider,
    eventType,
    eventId,
    receivedAt: new Date(),
    processed: false
  });
  return this.save();
};

// Instance method to send reminder
invoiceSchema.methods.sendReminder = async function () {
  this.remindersSent += 1;
  this.lastReminderAt = new Date();
  return this.save();
};

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function (next) {
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  // Calculate total
  this.total = this.subtotal - this.discount + this.tax;

  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

export { INVOICE_STATUS, PAYMENT_PROVIDERS, INVOICE_TYPES };